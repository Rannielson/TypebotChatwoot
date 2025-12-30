import * as cron from 'node-cron';
import { InboxModel } from '../models/inbox.model';
import { SessionBulkCloseService } from '../services/session-bulk-close.service';
import logger from '../utils/logger.util';

interface IntervalJob {
  intervalHours: number;
  cronJob: cron.ScheduledTask;
  cronExpression: string;
  inboxIds: number[];
}

export class SessionBulkCloseScheduler {
  private static jobs: Map<number, IntervalJob> = new Map(); // Jobs agrupados por intervalo
  private static isInitialized = false;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static readonly SYNC_INTERVAL_MINUTES = 5; // Sincroniza a cada 5 minutos

  /**
   * Inicializa o scheduler de encerramento em massa
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[SessionBulkCloseScheduler] Scheduler já foi inicializado');
      return;
    }

    logger.info('[SessionBulkCloseScheduler] Inicializando scheduler de encerramento em massa...');

    try {
      // Carrega e agenda jobs iniciais
      await this.syncJobs();

      this.isInitialized = true;
      logger.info('[SessionBulkCloseScheduler] ✅ Scheduler inicializado com sucesso');

      // Inicia verificação periódica para sincronizar (a cada 5 minutos)
      this.startPeriodicSync();
    } catch (error: any) {
      logger.error(
        `[SessionBulkCloseScheduler] Erro ao inicializar scheduler: ${error.message}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Inicia verificação periódica para sincronizar jobs com o banco de dados
   */
  private static startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Verifica a cada SYNC_INTERVAL_MINUTES minutos
    this.syncInterval = setInterval(() => {
      setImmediate(async () => {
        try {
          await this.syncJobs();
        } catch (error: any) {
          logger.error('[SessionBulkCloseScheduler] Erro na sincronização periódica', { error });
        }
      });
    }, this.SYNC_INTERVAL_MINUTES * 60 * 1000);

    logger.info(
      `[SessionBulkCloseScheduler] Verificação periódica iniciada (a cada ${this.SYNC_INTERVAL_MINUTES} minutos)`
    );
  }

  /**
   * Sincroniza jobs agendados com inboxes ativos no banco de dados
   * Agrupa inboxes por intervalo e cria/atualiza jobs cron
   */
  private static async syncJobs(): Promise<void> {
    try {
      logger.debug('[SessionBulkCloseScheduler] 🔍 Sincronizando jobs...');

      // Busca todos os inboxes ativos com bulk-close configurado
      const activeInboxes = await InboxModel.findAll();
      const inboxesWithBulkClose = activeInboxes.filter(
        (inbox) =>
          inbox.is_active &&
          inbox.auto_close_bulk_interval_hours &&
          inbox.auto_close_bulk_interval_hours > 0
      );

      // Agrupa inboxes por intervalo
      const inboxesByInterval = new Map<number, number[]>();
      for (const inbox of inboxesWithBulkClose) {
        const interval = inbox.auto_close_bulk_interval_hours!;
        if (!inboxesByInterval.has(interval)) {
          inboxesByInterval.set(interval, []);
        }
        inboxesByInterval.get(interval)!.push(inbox.id);
      }

      const currentIntervals = new Set(this.jobs.keys());

      // Remove jobs de intervalos que não têm mais inboxes
      for (const interval of currentIntervals) {
        if (!inboxesByInterval.has(interval)) {
          this.unscheduleIntervalJob(interval);
          logger.info(
            `[SessionBulkCloseScheduler] 🗑️  Removido: Intervalo ${interval}h (sem inboxes ativos)`
          );
        }
      }

      // Adiciona ou atualiza jobs para cada intervalo
      for (const [interval, inboxIds] of inboxesByInterval.entries()) {
        const isScheduled = currentIntervals.has(interval);
        const existingJob = this.jobs.get(interval);

        // Verifica se precisa atualizar (inboxes mudaram)
        if (existingJob) {
          const inboxIdsChanged =
            existingJob.inboxIds.length !== inboxIds.length ||
            !existingJob.inboxIds.every((id) => inboxIds.includes(id));

          if (inboxIdsChanged) {
            logger.info(
              `[SessionBulkCloseScheduler] 🔄 Atualizando: Intervalo ${interval}h ` +
              `(${inboxIds.length} inbox(es))`
            );
            await this.scheduleIntervalJob(interval, inboxIds);
          }
        } else {
          logger.info(
            `[SessionBulkCloseScheduler] ➕ Adicionado: Intervalo ${interval}h ` +
            `(${inboxIds.length} inbox(es))`
          );
          await this.scheduleIntervalJob(interval, inboxIds);
        }
      }

      logger.debug(
        `[SessionBulkCloseScheduler] ✅ Sincronização concluída: ` +
        `${inboxesByInterval.size} intervalo(s) agendado(s), ` +
        `${inboxesWithBulkClose.length} inbox(es) com bulk-close configurado`
      );
    } catch (error: any) {
      logger.error(
        `[SessionBulkCloseScheduler] ❌ Erro ao sincronizar jobs: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Agenda um job cron para um intervalo específico
   * Processa todos os inboxes com esse intervalo
   */
  private static async scheduleIntervalJob(
    intervalHours: number,
    inboxIds: number[]
  ): Promise<void> {
    // Remove job existente se houver
    this.unscheduleIntervalJob(intervalHours);

    // Calcula expressão cron baseada no intervalo em horas
    const cronExpression = this.buildCronExpression(intervalHours);

    // Cria job cron
    const cronJob = cron.schedule(
      cronExpression,
      async () => {
        setImmediate(async () => {
          const startTime = Date.now();
          logger.info(
            `[SessionBulkCloseScheduler] ⏰ EXECUTANDO: Intervalo ${intervalHours}h ` +
            `- ${inboxIds.length} inbox(es) (IDs: ${inboxIds.join(', ')})`
          );

          try {
            // Processa cada inbox com esse intervalo
            let totalClosed = 0;
            let totalRedisKeysRemoved = 0;

            for (const inboxId of inboxIds) {
              try {
                const result = await SessionBulkCloseService.executeBulkCloseForInbox(inboxId);
                totalClosed += result.sessionsClosed;
                totalRedisKeysRemoved += result.redisKeysRemoved;
              } catch (error: any) {
                logger.error(
                  `[SessionBulkCloseScheduler] ❌ Erro ao processar inbox ${inboxId}: ${error.message}`
                );
              }
            }

            const duration = Date.now() - startTime;
            logger.info(
              `[SessionBulkCloseScheduler] ✅ CONCLUÍDO: Intervalo ${intervalHours}h - ` +
              `${totalClosed} sessões encerradas, ` +
              `${totalRedisKeysRemoved} chaves removidas do Redis, ` +
              `Duração: ${duration}ms`
            );
          } catch (error: any) {
            logger.error(
              `[SessionBulkCloseScheduler] ❌ Erro ao executar intervalo ${intervalHours}h: ${error.message}`
            );
          }
        });
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    // Armazena job
    this.jobs.set(intervalHours, {
      intervalHours,
      cronJob,
      cronExpression,
      inboxIds,
    });

    logger.info(
      `[SessionBulkCloseScheduler] ✅ Intervalo ${intervalHours}h agendado: ` +
      `${inboxIds.length} inbox(es) (${cronExpression})`
    );
  }

  /**
   * Remove agendamento de um intervalo
   */
  private static unscheduleIntervalJob(intervalHours: number): void {
    const job = this.jobs.get(intervalHours);
    if (job) {
      job.cronJob.stop();
      job.cronJob.destroy();
      this.jobs.delete(intervalHours);
      logger.info(
        `[SessionBulkCloseScheduler] 🗑️  Intervalo ${intervalHours}h removido do agendamento`
      );
    }
  }

  /**
   * Constrói expressão cron baseada em horas
   * Exemplo: 1 hora = a cada 1 hora, 2 horas = a cada 2 horas
   */
  private static buildCronExpression(hours: number): string {
    if (hours < 1) {
      throw new Error('Intervalo mínimo é 1 hora');
    }

    // Para intervalos menores que 24 horas, usa formato "0 */N * * *"
    // Exemplo: 1 hora = "0 * * * *", 2 horas = "0 */2 * * *"
    if (hours < 24) {
      if (hours === 1) {
        return '0 * * * *'; // A cada hora
      }
      return `0 */${hours} * * *`; // A cada N horas
    }

    // Para intervalos maiores, converte para dias
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return '0 0 * * *'; // Diariamente à meia-noite
    }
    return `0 0 */${days} * *`; // A cada N dias
  }

  /**
   * Para o scheduler (útil para shutdown graceful)
   */
  static stop(): void {
    logger.info('[SessionBulkCloseScheduler] Parando scheduler...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    for (const interval of this.jobs.keys()) {
      this.unscheduleIntervalJob(interval);
    }

    this.isInitialized = false;
    logger.info('[SessionBulkCloseScheduler] ✅ Scheduler parado');
  }

  /**
   * Retorna status do scheduler
   */
  static getStatus(): {
    isInitialized: boolean;
    activeJobs: number;
    intervals: Array<{ intervalHours: number; cronExpression: string; inboxCount: number }>;
  } {
    return {
      isInitialized: this.isInitialized,
      activeJobs: this.jobs.size,
      intervals: Array.from(this.jobs.values()).map((job) => ({
        intervalHours: job.intervalHours,
        cronExpression: job.cronExpression,
        inboxCount: job.inboxIds.length,
      })),
    };
  }
}

