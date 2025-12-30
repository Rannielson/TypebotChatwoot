import * as cron from 'node-cron';
import { SessionAutoCloseService } from '../services/session-auto-close.service';
import logger from '../utils/logger.util';

export class SessionAutoCloseScheduler {
  private static cronJob: cron.ScheduledTask | null = null;
  private static isInitialized = false;
  private static readonly CHECK_INTERVAL_MINUTES = 1; // Verifica a cada 1 minuto

  /**
   * Inicializa o scheduler de encerramento automático de sessões
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[SessionAutoCloseScheduler] Scheduler já foi inicializado');
      return;
    }

    logger.info('[SessionAutoCloseScheduler] Inicializando scheduler de encerramento automático de sessões...');

    try {
      // Cria cron job que executa a cada CHECK_INTERVAL_MINUTES minutos
      // Formato: */1 * * * * = a cada 1 minuto
      const cronExpression = `*/${this.CHECK_INTERVAL_MINUTES} * * * *`;

      this.cronJob = cron.schedule(
        cronExpression,
        async () => {
          // Usa setImmediate para não bloquear o event loop
          setImmediate(async () => {
            const startTime = Date.now();
            logger.debug('[SessionAutoCloseScheduler] ⏰ Executando verificação de sessões expiradas...');

            try {
              const result = await SessionAutoCloseService.processAllInboxes();

              const duration = Date.now() - startTime;
              
              if (result.totalSessionsClosed > 0) {
                logger.info(
                  `[SessionAutoCloseScheduler] ✅ Verificação concluída: ` +
                  `${result.inboxesWithAutoClose} inboxes processados, ` +
                  `${result.totalSessionsClosed} sessões encerradas, ` +
                  `${result.totalRedisKeysRemoved} chaves removidas do Redis, ` +
                  `Duração: ${duration}ms`
                );

                // Log detalhado por inbox se houver sessões encerradas
                result.results.forEach((inboxResult) => {
                  if (inboxResult.sessionsClosed > 0) {
                    logger.info(
                      `[SessionAutoCloseScheduler]    • Inbox ${inboxResult.inboxId} ` +
                      `(${inboxResult.inboxName || 'sem nome'}): ` +
                      `${inboxResult.sessionsClosed} sessão(ões) encerrada(s)`
                    );
                  }
                });
              } else {
                logger.debug(
                  `[SessionAutoCloseScheduler] ✅ Verificação concluída: ` +
                  `Nenhuma sessão expirada encontrada ` +
                  `(${result.inboxesWithAutoClose} inboxes com auto-close configurado, ` +
                  `Duração: ${duration}ms)`
                );
              }
            } catch (error: any) {
              logger.error(
                `[SessionAutoCloseScheduler] ❌ Erro ao processar encerramento automático: ${error.message}`,
                { error }
              );
            }
          });
        },
        {
          timezone: 'America/Sao_Paulo',
        }
      );

      this.isInitialized = true;
      logger.info(
        `[SessionAutoCloseScheduler] ✅ Scheduler inicializado com sucesso ` +
        `(verificação a cada ${this.CHECK_INTERVAL_MINUTES} minuto(s))`
      );
    } catch (error: any) {
      logger.error(
        `[SessionAutoCloseScheduler] Erro ao inicializar scheduler: ${error.message}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Para o scheduler (útil para shutdown graceful)
   */
  static stop(): void {
    logger.info('[SessionAutoCloseScheduler] Parando scheduler...');

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
    }

    this.isInitialized = false;
    logger.info('[SessionAutoCloseScheduler] ✅ Scheduler parado');
  }

  /**
   * Retorna status do scheduler
   */
  static getStatus(): {
    isInitialized: boolean;
    checkIntervalMinutes: number;
  } {
    return {
      isInitialized: this.isInitialized,
      checkIntervalMinutes: this.CHECK_INTERVAL_MINUTES,
    };
  }
}

