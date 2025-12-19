import * as cron from 'node-cron';
import { TriggerModel } from '../models/trigger.model';
import { ConversationTriggerService } from '../services/conversation-trigger.service';
import logger from '../utils/logger.util';

interface ScheduledJob {
  triggerId: number;
  cronJob: cron.ScheduledTask;
  cronExpression: string;
}

interface FrequencyJob {
  frequencyMinutes: number;
  cronJob: cron.ScheduledTask;
  cronExpression: string;
}

export class TriggerScheduler {
  private static jobs: Map<number, ScheduledJob> = new Map(); // Jobs individuais (legacy)
  private static frequencyJobs: Map<number, FrequencyJob> = new Map(); // Jobs agrupados por frequência (otimizado)
  private static isInitialized = false;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static useOptimizedMode = true; // Flag para usar modo otimizado

  /**
   * Inicializa o scheduler e carrega todos os triggers ativos
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[TriggerScheduler] Scheduler já foi inicializado');
      return;
    }

    logger.info('[TriggerScheduler] Inicializando scheduler de triggers...');

    try {
      // Busca todos os triggers ativos
      const activeTriggers = await TriggerModel.findActive();
      
      logger.info(
        `[TriggerScheduler] Encontrados ${activeTriggers.length} trigger(s) ativo(s) no banco de dados`
      );
      
      // Log detalhado dos triggers encontrados
      if (activeTriggers.length > 0) {
        logger.info('[TriggerScheduler] 📋 Triggers encontrados:');
        for (const trigger of activeTriggers) {
          const inboxIds = await TriggerModel.getInboxIdsForTrigger(trigger.id);
          logger.info(
            `[TriggerScheduler]    • Trigger ${trigger.id} (${trigger.name}): ` +
            `Frequência: ${trigger.check_frequency_minutes}min, ` +
            `Inboxes: ${inboxIds.length} (IDs: ${inboxIds.length > 0 ? inboxIds.join(', ') : 'nenhum'})`
          );
        }
      } else {
        logger.warn('[TriggerScheduler] ⚠️  Nenhum trigger ativo encontrado no banco de dados');
      }

      if (this.useOptimizedMode) {
        // MODO OTIMIZADO: Agrupa triggers por frequência
        // Cria um cron job por frequência (ex: 1 minuto, 3 minutos, 5 minutos)
        // Cada job processa TODOS os triggers com essa frequência
        await this.scheduleTriggersByFrequency(activeTriggers);
      } else {
        // MODO LEGACY: Agenda cada trigger individualmente
        for (const trigger of activeTriggers) {
          await this.scheduleTrigger(trigger.id);
        }
      }

      this.isInitialized = true;
      logger.info('[TriggerScheduler] ✅ Scheduler inicializado com sucesso');

      // Inicia verificação periódica para sincronizar triggers (a cada 1 minuto)
      this.startPeriodicSync();
    } catch (error: any) {
      logger.error(
        `[TriggerScheduler] Erro ao inicializar scheduler: ${error.message}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Inicia verificação periódica para sincronizar triggers com o banco de dados
   * Verifica a cada 1 minuto se há novos triggers ou mudanças
   * Usa setImmediate para evitar bloquear o event loop
   */
  private static startPeriodicSync(): void {
    // Para intervalo anterior se existir
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Verifica a cada 1 minuto
    // Usa setImmediate para evitar bloquear o event loop e causar execuções perdidas
    this.syncInterval = setInterval(() => {
      // Usa setImmediate para executar de forma assíncrona e não bloquear
      setImmediate(async () => {
        try {
          await this.syncTriggers();
        } catch (error: any) {
          logger.error('[TriggerScheduler] Erro na sincronização periódica de triggers', { error });
        }
      });
    }, 60 * 1000); // 1 minuto

    logger.info('[TriggerScheduler] Verificação periódica de triggers iniciada (a cada 1 minuto)');
  }

  /**
   * Sincroniza triggers agendados com triggers ativos no banco de dados
   * - Adiciona novos triggers ativos que não estão agendados
   * - Remove triggers que foram desativados
   * - Reagenda triggers que foram atualizados
   * Otimizado para evitar bloqueios do event loop
   */
  private static async syncTriggers(): Promise<void> {
    const syncStartTime = Date.now();
    try {
      logger.debug('[TriggerScheduler] 🔍 Iniciando verificação periódica de triggers...');
      
      // Busca todos os triggers ativos no banco (com timeout implícito)
      const activeTriggers = await TriggerModel.findActive();
      const activeTriggerIds = new Set(activeTriggers.map(t => t.id));

      // Busca triggers atualmente agendados (modo otimizado usa frequencyJobs)
      const scheduledTriggerIds = new Set(
        this.useOptimizedMode 
          ? [] // No modo otimizado, não usamos jobs individuais
          : this.jobs.keys()
      );

      const changes: string[] = [];
      let hasChanges = false;

      // Remove triggers que foram desativados ou deletados
      // Otimização: busca nomes apenas quando necessário e em batch
      const removedTriggerIds: number[] = [];
      for (const scheduledId of scheduledTriggerIds) {
        if (!activeTriggerIds.has(scheduledId)) {
          removedTriggerIds.push(scheduledId);
        }
      }

      // Processa remoções de forma assíncrona para não bloquear
      if (removedTriggerIds.length > 0) {
        // Busca nomes em paralelo apenas se necessário para log
        const triggerNames = await Promise.all(
          removedTriggerIds.map(async (id) => {
            try {
              const triggerInfo = await TriggerModel.findById(id);
              return triggerInfo?.name || `Trigger ${id}`;
            } catch {
              return `Trigger ${id}`;
            }
          })
        );

        for (let i = 0; i < removedTriggerIds.length; i++) {
          const scheduledId = removedTriggerIds[i];
          const triggerName = triggerNames[i];
          
          logger.info(
            `[TriggerScheduler] 🗑️  REMOVIDO: Trigger ${scheduledId} (${triggerName}) foi desativado ou deletado, removendo do agendamento`
          );
          
          this.unscheduleTrigger(scheduledId);
          changes.push(`Removido: Trigger ${scheduledId} (${triggerName})`);
          hasChanges = true;
        }
      }

      if (this.useOptimizedMode) {
        // MODO OTIMIZADO: Reagenda por frequência
        // Agrupa triggers por frequência
        const triggersByFrequency = new Map<number, any[]>();
        const currentFrequencies = new Set(this.frequencyJobs.keys());
        
        for (const trigger of activeTriggers) {
          const frequency = trigger.check_frequency_minutes;
          if (!triggersByFrequency.has(frequency)) {
            triggersByFrequency.set(frequency, []);
          }
          triggersByFrequency.get(frequency)!.push(trigger);
        }

        // Remove frequências que não têm mais triggers
        for (const frequency of currentFrequencies) {
          if (!triggersByFrequency.has(frequency)) {
            this.unscheduleFrequencyJob(frequency);
            changes.push(`Removida: Frequência ${frequency}min (sem triggers ativos)`);
            hasChanges = true;
          }
        }

        // Adiciona ou atualiza frequências
        for (const [frequency, triggers] of triggersByFrequency.entries()) {
          const isScheduled = currentFrequencies.has(frequency);
          
          if (!isScheduled) {
            logger.info(
              `[TriggerScheduler] ➕ ADICIONADA: Nova frequência ${frequency}min com ${triggers.length} trigger(s)`
            );
            await this.scheduleFrequencyJob(frequency, triggers);
            changes.push(`Adicionada: Frequência ${frequency}min (${triggers.length} trigger(s))`);
            hasChanges = true;
          } else {
            // Verifica se precisa reagendar (se triggers mudaram)
            await this.scheduleFrequencyJob(frequency, triggers);
            // Não marca como mudança se já estava agendada (só atualiza)
          }
        }
      } else {
        // MODO LEGACY: Processa triggers individualmente
        // Adiciona ou atualiza triggers ativos
        for (const trigger of activeTriggers) {
          const isScheduled = scheduledTriggerIds.has(trigger.id);

          if (!isScheduled) {
            // Novo trigger ativo que não está agendado
            logger.info(
              `[TriggerScheduler] ➕ ADICIONADO: Novo trigger ativo detectado: ${trigger.id} (${trigger.name}), agendando...`
            );

            await this.scheduleTrigger(trigger.id);
            changes.push(`Adicionado: Trigger ${trigger.id} (${trigger.name})`);
            hasChanges = true;
          } else {
            // Verifica se o trigger foi atualizado (frequência mudou, etc)
            const existingJob = this.jobs.get(trigger.id);
            if (existingJob) {
              const expectedCron = this.buildCronExpression(trigger.check_frequency_minutes);
              if (existingJob.cronExpression !== expectedCron) {
                logger.info(
                  `[TriggerScheduler] 🔄 ATUALIZADO: Trigger ${trigger.id} (${trigger.name}) teve frequência alterada ` +
                  `de "${existingJob.cronExpression}" para "${expectedCron}", reagendando...`
                );

                await this.scheduleTrigger(trigger.id);
                changes.push(`Atualizado: Trigger ${trigger.id} (${trigger.name}) - frequência alterada`);
                hasChanges = true;
              }
            }
          }
        }
      }

      // Log resumo da verificação
      if (hasChanges) {
        logger.info(
          `[TriggerScheduler] ✅ Verificação concluída: ${changes.length} alteração(ões) detectada(s)`
        );
        changes.forEach((change, index) => {
          logger.info(`[TriggerScheduler]    ${index + 1}. ${change}`);
        });
      } else {
        logger.debug(
          `[TriggerScheduler] ✅ Verificação concluída: Nenhuma alteração detectada ` +
          `(${activeTriggers.length} trigger(s) ativo(s), ${scheduledTriggerIds.size} agendado(s))`
        );
      }

      // Log detalhado dos triggers ativos (apenas em debug)
      if (activeTriggers.length > 0) {
        logger.debug('[TriggerScheduler] 📋 Triggers ativos no banco:');
        activeTriggers.forEach((trigger) => {
          const isScheduled = scheduledTriggerIds.has(trigger.id);
          const status = isScheduled ? '✅ Agendado' : '⚠️  Não agendado';
          logger.debug(
            `[TriggerScheduler]    • Trigger ${trigger.id} (${trigger.name}): ${status} ` +
            `- Frequência: ${trigger.check_frequency_minutes}min`
          );
        });
      }
    } catch (error: any) {
      logger.error(
        `[TriggerScheduler] ❌ Erro ao sincronizar triggers: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Agenda um trigger específico
   */
  static async scheduleTrigger(triggerId: number): Promise<void> {
    try {
      const trigger = await TriggerModel.findById(triggerId);
      if (!trigger || !trigger.is_active) {
        logger.debug(
          `[TriggerScheduler] Trigger ${triggerId} não encontrado ou inativo, não agendando`
        );
        return;
      }

      // Remove job existente se houver
      this.unscheduleTrigger(triggerId);

      // Calcula expressão cron baseada na frequência
      const cronExpression = this.buildCronExpression(trigger.check_frequency_minutes);
      
      // Busca inboxes associados ao trigger
      const inboxIds = await TriggerModel.getInboxIdsForTrigger(triggerId);

      if (inboxIds.length === 0) {
        logger.debug(
          `[TriggerScheduler] Trigger ${triggerId} não tem inboxes associados, não agendando`
        );
        return;
      }

      // Cria job cron com opções otimizadas para evitar avisos de execuções perdidas
      const cronJob = cron.schedule(
        cronExpression,
        async () => {
          // Usa setImmediate para não bloquear o event loop
          setImmediate(async () => {
            const startTime = Date.now();
            logger.info(
              `[TriggerScheduler] ⏰ EXECUTANDO: Trigger ${triggerId} (${trigger.name}) ` +
              `- Frequência: ${trigger.check_frequency_minutes}min, ` +
              `Inboxes: ${inboxIds.length} (IDs: ${inboxIds.join(', ')})`
            );

            // Executa para cada inbox associado
            let successCount = 0;
            let errorCount = 0;
            
            for (const inboxId of inboxIds) {
              try {
                await ConversationTriggerService.checkAndTriggerConversations(
                  inboxId,
                  triggerId
                );
                successCount++;
              } catch (error: any) {
                errorCount++;
                logger.error(
                  `[TriggerScheduler] ❌ Erro ao executar trigger ${triggerId} (${trigger.name}) ` +
                  `para inbox ${inboxId}: ${error.message}`
                );
                // Continua com próximo inbox mesmo se houver erro
              }
            }

            const duration = Date.now() - startTime;
            logger.info(
              `[TriggerScheduler] ✅ CONCLUÍDO: Trigger ${triggerId} (${trigger.name}) - ` +
              `Sucesso: ${successCount}/${inboxIds.length}, Erros: ${errorCount}, ` +
              `Duração: ${duration}ms`
            );
          });
        },
        {
          timezone: 'America/Sao_Paulo',
        }
      );

      // Armazena job
      this.jobs.set(triggerId, {
        triggerId,
        cronJob,
        cronExpression,
      });

      logger.info(
        `[TriggerScheduler] ✅ Trigger ${triggerId} (${trigger.name}) agendado com sucesso: ` +
        `Frequência: ${trigger.check_frequency_minutes} minutos (${cronExpression}), ` +
        `Inboxes: ${inboxIds.length} (IDs: ${inboxIds.join(', ')})`
      );
    } catch (error: any) {
      logger.error(
        `[TriggerScheduler] Erro ao agendar trigger ${triggerId}: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Remove agendamento de um trigger
   */
  static unscheduleTrigger(triggerId: number): void {
    const job = this.jobs.get(triggerId);
    if (job) {
      job.cronJob.stop();
      job.cronJob.destroy();
      this.jobs.delete(triggerId);
      logger.info(
        `[TriggerScheduler] 🗑️  Trigger ${triggerId} removido do agendamento ` +
        `(cron: ${job.cronExpression})`
      );
    } else {
      logger.debug(
        `[TriggerScheduler] Trigger ${triggerId} não estava agendado, nada a remover`
      );
    }
  }

  /**
   * Reconstrói todos os agendamentos (útil após atualizações)
   */
  static async reloadAll(): Promise<void> {
    logger.info('[TriggerScheduler] Recarregando todos os triggers...');

    // Para todos os jobs existentes (legacy e otimizado)
    for (const [triggerId] of this.jobs) {
      this.unscheduleTrigger(triggerId);
    }
    
    for (const frequency of this.frequencyJobs.keys()) {
      this.unscheduleFrequencyJob(frequency);
    }

    // Reinicializa
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * OTIMIZADO: Agenda triggers agrupados por frequência
   * Cria um cron job por frequência única (ex: 1min, 3min, 5min)
   * Cada job processa TODOS os triggers com essa frequência
   */
  private static async scheduleTriggersByFrequency(
    activeTriggers: any[]
  ): Promise<void> {
    // Agrupa triggers por frequência
    const triggersByFrequency = new Map<number, any[]>();
    const triggersWithoutInboxes: any[] = [];
    
    for (const trigger of activeTriggers) {
      // Verifica se o trigger tem inboxes associados
      const inboxIds = await TriggerModel.getInboxIdsForTrigger(trigger.id);
      
      if (inboxIds.length === 0) {
        logger.warn(
          `[TriggerScheduler] ⚠️  Trigger ${trigger.id} (${trigger.name}) não tem inboxes associados, não será agendado`
        );
        triggersWithoutInboxes.push(trigger);
        continue;
      }
      
      const frequency = trigger.check_frequency_minutes;
      if (!triggersByFrequency.has(frequency)) {
        triggersByFrequency.set(frequency, []);
      }
      triggersByFrequency.get(frequency)!.push(trigger);
    }

    if (triggersWithoutInboxes.length > 0) {
      logger.warn(
        `[TriggerScheduler] ⚠️  ${triggersWithoutInboxes.length} trigger(s) sem inboxes associados: ` +
        triggersWithoutInboxes.map(t => `${t.id} (${t.name})`).join(', ')
      );
    }

    logger.info(
      `[TriggerScheduler] 🚀 OTIMIZAÇÃO: Agrupando ${activeTriggers.length - triggersWithoutInboxes.length} trigger(s) ` +
      `em ${triggersByFrequency.size} frequência(s) única(s)`
    );

    // Cria um cron job para cada frequência
    for (const [frequency, triggers] of triggersByFrequency.entries()) {
      await this.scheduleFrequencyJob(frequency, triggers);
    }

    // Log resumo
    triggersByFrequency.forEach((triggers, frequency) => {
      logger.info(
        `[TriggerScheduler] 📊 Frequência ${frequency}min: ${triggers.length} trigger(s) ` +
        `(${triggers.map(t => t.name).join(', ')})`
      );
    });
  }

  /**
   * Agenda um cron job para uma frequência específica
   * Processa TODOS os triggers com essa frequência
   */
  private static async scheduleFrequencyJob(
    frequencyMinutes: number,
    triggers: any[]
  ): Promise<void> {
    // Remove job existente se houver
    this.unscheduleFrequencyJob(frequencyMinutes);

    // Calcula expressão cron
    const cronExpression = this.buildCronExpression(frequencyMinutes);

    // Cria job cron com opções otimizadas para evitar avisos de execuções perdidas
    const cronJob = cron.schedule(
      cronExpression,
      async () => {
        // Usa setImmediate para não bloquear o event loop
        setImmediate(async () => {
          const startTime = Date.now();
          logger.info(
            `[TriggerScheduler] ⏰ EXECUTANDO (OTIMIZADO): Frequência ${frequencyMinutes}min ` +
            `- ${triggers.length} trigger(s) (${triggers.map(t => t.name).join(', ')})`
          );

          try {
            // Chama método otimizado que agrupa triggers por frequência
            await ConversationTriggerService.checkAndTriggerConversationsByFrequency(
              frequencyMinutes
            );

            const duration = Date.now() - startTime;
            logger.info(
              `[TriggerScheduler] ✅ CONCLUÍDO (OTIMIZADO): Frequência ${frequencyMinutes}min - ` +
              `Duração: ${duration}ms`
            );
          } catch (error: any) {
            logger.error(
              `[TriggerScheduler] ❌ Erro ao executar frequência ${frequencyMinutes}min: ${error.message}`
            );
          }
        });
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    // Armazena job
    this.frequencyJobs.set(frequencyMinutes, {
      frequencyMinutes,
      cronJob,
      cronExpression,
    });

    logger.info(
      `[TriggerScheduler] ✅ Frequência ${frequencyMinutes}min agendada com sucesso: ` +
      `${triggers.length} trigger(s) (${cronExpression})`
    );
  }

  /**
   * Remove agendamento de uma frequência
   */
  private static unscheduleFrequencyJob(frequencyMinutes: number): void {
    const job = this.frequencyJobs.get(frequencyMinutes);
    if (job) {
      job.cronJob.stop();
      job.cronJob.destroy();
      this.frequencyJobs.delete(frequencyMinutes);
      logger.info(
        `[TriggerScheduler] 🗑️  Frequência ${frequencyMinutes}min removida do agendamento`
      );
    }
  }

  /**
   * Constrói expressão cron baseada em minutos
   * Exemplo: 3 minutos = a cada 3 minutos
   */
  private static buildCronExpression(minutes: number): string {
    if (minutes < 1) {
      throw new Error('Frequência mínima é 1 minuto');
    }

    // Para frequências menores que 60 minutos, usa formato "*/N * * * *"
    if (minutes < 60) {
      return `*/${minutes} * * * *`;
    }

    // Para frequências maiores, converte para horas
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      // Exatamente N horas
      return `0 */${hours} * * *`;
    } else {
      // N horas e M minutos - usa formato mais complexo
      // Por simplicidade, arredonda para a hora mais próxima
      return `0 */${hours} * * *`;
    }
  }

  /**
   * Para o scheduler (útil para shutdown graceful)
   */
  static stop(): void {
    logger.info('[TriggerScheduler] Parando scheduler...');
    
    // Para verificação periódica
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Para todos os jobs (legacy e otimizado)
    for (const [triggerId] of this.jobs) {
      this.unscheduleTrigger(triggerId);
    }
    
    for (const frequency of this.frequencyJobs.keys()) {
      this.unscheduleFrequencyJob(frequency);
    }

    this.isInitialized = false;
    logger.info('[TriggerScheduler] ✅ Scheduler parado');
  }

  /**
   * Retorna status do scheduler
   */
  static getStatus(): {
    isInitialized: boolean;
    activeJobs: number;
    frequencyJobs: number;
    jobs: Array<{ triggerId: number; cronExpression: string }>;
    frequencies: Array<{ frequencyMinutes: number; cronExpression: string }>;
    useOptimizedMode: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      activeJobs: this.jobs.size,
      frequencyJobs: this.frequencyJobs.size,
      jobs: Array.from(this.jobs.values()).map((job) => ({
        triggerId: job.triggerId,
        cronExpression: job.cronExpression,
      })),
      frequencies: Array.from(this.frequencyJobs.values()).map((job) => ({
        frequencyMinutes: job.frequencyMinutes,
        cronExpression: job.cronExpression,
      })),
      useOptimizedMode: this.useOptimizedMode,
    };
  }
}
