import { InboxModel } from '../models/inbox.model';
import { SessionService } from './session.service';
import logger from '../utils/logger.util';

export class SessionBulkCloseService {
  /**
   * Executa encerramento em massa para um inbox específico
   * Baseado no intervalo configurado em auto_close_bulk_interval_hours
   * Encerra sessões criadas há mais tempo que o intervalo configurado
   * 
   * @param inboxId ID interno do inbox
   * @returns Resultado do encerramento em massa
   */
  static async executeBulkCloseForInbox(inboxId: number): Promise<{
    inboxId: number;
    inboxName: string | null;
    bulkIntervalHours: number | null;
    sessionsClosed: number;
    redisKeysRemoved: number;
  }> {
    // Busca o inbox
    const inbox = await InboxModel.findById(inboxId);
    
    if (!inbox) {
      throw new Error(`Inbox ${inboxId} não encontrado`);
    }

    // Se auto_close_bulk_interval_hours não estiver configurado, não faz nada
    if (!inbox.auto_close_bulk_interval_hours || inbox.auto_close_bulk_interval_hours <= 0) {
      return {
        inboxId,
        inboxName: inbox.inbox_name,
        bulkIntervalHours: null,
        sessionsClosed: 0,
        redisKeysRemoved: 0,
      };
    }

    logger.info(
      `[SessionBulkCloseService] 🔍 Executando encerramento em massa para inbox ${inboxId} ` +
      `(${inbox.inbox_name || 'sem nome'}) - Intervalo: ${inbox.auto_close_bulk_interval_hours} horas`
    );

    // Executa encerramento em massa de sessões criadas há mais tempo que o intervalo
    // Usa created_at para considerar a idade da sessão
    const result = await SessionService.closeSessionsBulk(inboxId, {
      status: undefined, // Encerra active e paused
      olderThanHours: inbox.auto_close_bulk_interval_hours,
    });

    logger.info(
      `[SessionBulkCloseService] ✅ Encerramento em massa concluído para inbox ${inboxId}: ` +
      `${result.closed} sessões encerradas, ` +
      `${result.redisKeysRemoved} chaves removidas do Redis`
    );

    return {
      inboxId,
      inboxName: inbox.inbox_name,
      bulkIntervalHours: inbox.auto_close_bulk_interval_hours,
      sessionsClosed: result.closed,
      redisKeysRemoved: result.redisKeysRemoved,
    };
  }

  /**
   * Processa encerramento em massa para todos os inboxes ativos
   * que têm auto_close_bulk_interval_hours configurado
   * 
   * @returns Resultado agregado do processamento
   */
  static async processAllInboxes(): Promise<{
    inboxesProcessed: number;
    inboxesWithBulkClose: number;
    totalSessionsClosed: number;
    totalRedisKeysRemoved: number;
    results: Array<{
      inboxId: number;
      inboxName: string | null;
      sessionsClosed: number;
    }>;
  }> {
    logger.info('[SessionBulkCloseService] 🚀 Iniciando processamento de encerramento em massa para todos os inboxes');

    // Busca todos os inboxes ativos
    const activeInboxes = await InboxModel.findAll();
    const inboxesWithBulkClose = activeInboxes.filter(
      (inbox) => 
        inbox.is_active && 
        inbox.auto_close_bulk_interval_hours && 
        inbox.auto_close_bulk_interval_hours > 0
    );

    logger.info(
      `[SessionBulkCloseService] 📋 Inboxes ativos: ${activeInboxes.length}, ` +
      `com bulk-close configurado: ${inboxesWithBulkClose.length}`
    );

    let totalSessionsClosed = 0;
    let totalRedisKeysRemoved = 0;
    const results: Array<{
      inboxId: number;
      inboxName: string | null;
      sessionsClosed: number;
    }> = [];

    // Processa cada inbox com bulk-close configurado
    for (const inbox of inboxesWithBulkClose) {
      try {
        const result = await this.executeBulkCloseForInbox(inbox.id);
        totalSessionsClosed += result.sessionsClosed;
        totalRedisKeysRemoved += result.redisKeysRemoved;
        
        results.push({
          inboxId: result.inboxId,
          inboxName: result.inboxName,
          sessionsClosed: result.sessionsClosed,
        });
      } catch (error: any) {
        logger.error(
          `[SessionBulkCloseService] ❌ Erro ao processar inbox ${inbox.id}: ${error.message}`
        );
      }
    }

    logger.info(
      `[SessionBulkCloseService] ✅ Processamento concluído: ` +
      `${inboxesWithBulkClose.length} inboxes processados, ` +
      `${totalSessionsClosed} sessões encerradas, ` +
      `${totalRedisKeysRemoved} chaves removidas do Redis`
    );

    return {
      inboxesProcessed: activeInboxes.length,
      inboxesWithBulkClose: inboxesWithBulkClose.length,
      totalSessionsClosed,
      totalRedisKeysRemoved,
      results,
    };
  }
}

