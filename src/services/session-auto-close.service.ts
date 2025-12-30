import { InboxModel } from '../models/inbox.model';
import { SessionModel, SessionHistory } from '../models/session.model';
import { redis } from '../config/redis';
import logger from '../utils/logger.util';

export class SessionAutoCloseService {
  /**
   * Encerra sessões automaticamente para um inbox específico
   * Baseado no tempo configurado em auto_close_minutes
   * 
   * @param inboxId ID interno do inbox
   * @returns Resultado do encerramento automático
   */
  static async closeExpiredSessionsForInbox(inboxId: number): Promise<{
    inboxId: number;
    inboxName: string | null;
    autoCloseMinutes: number | null;
    sessionsFound: number;
    sessionsClosed: number;
    redisKeysRemoved: number;
  }> {
    // Busca o inbox
    const inbox = await InboxModel.findById(inboxId);
    
    if (!inbox) {
      throw new Error(`Inbox ${inboxId} não encontrado`);
    }

    // Se auto_close_minutes não estiver configurado, não faz nada
    if (!inbox.auto_close_minutes || inbox.auto_close_minutes <= 0) {
      return {
        inboxId,
        inboxName: inbox.inbox_name,
        autoCloseMinutes: null,
        sessionsFound: 0,
        sessionsClosed: 0,
        redisKeysRemoved: 0,
      };
    }

    logger.info(
      `[SessionAutoCloseService] 🔍 Verificando sessões expiradas para inbox ${inboxId} ` +
      `(${inbox.inbox_name || 'sem nome'}) - Tempo limite: ${inbox.auto_close_minutes} minutos`
    );

    // Busca sessões ativas ou pausadas que foram atualizadas há mais de auto_close_minutes
    // Usa updated_at para considerar a última atividade/interação
    const sessionsToClose = await SessionModel.findExpiredByUpdatedAt({
      inboxId,
      olderThanMinutes: inbox.auto_close_minutes,
      status: undefined, // Busca active e paused
    });

    logger.info(
      `[SessionAutoCloseService] 📊 Sessões expiradas encontradas: ${sessionsToClose.length} ` +
      `(updated_at há mais de ${inbox.auto_close_minutes} minutos)`
    );

    if (sessionsToClose.length === 0) {
      return {
        inboxId,
        inboxName: inbox.inbox_name,
        autoCloseMinutes: inbox.auto_close_minutes,
        sessionsFound: 0,
        sessionsClosed: 0,
        redisKeysRemoved: 0,
      };
    }

    // Encerra sessões usando o SessionService que já gerencia Redis
    let closedCount = 0;
    let redisKeysRemoved = 0;

    for (const session of sessionsToClose) {
      try {
        // Usa o método close do SessionModel para encerrar individualmente
        await SessionModel.close(session.id);
        closedCount++;

        // Remove do Redis
        const pattern = `session:${session.tenant_id}:${session.inbox_id}:${session.conversation_id}:${session.phone_number}`;
        const keys = await redis.keys(pattern);
        
        for (const key of keys) {
          await redis.del(key);
          redisKeysRemoved++;
        }

        logger.debug(
          `[SessionAutoCloseService] ✅ Sessão ${session.id} encerrada ` +
          `(Conversation: ${session.conversation_id}, Phone: ${session.phone_number})`
        );
      } catch (error: any) {
        logger.error(
          `[SessionAutoCloseService] ❌ Erro ao encerrar sessão ${session.id}: ${error.message}`
        );
      }
    }

    logger.info(
      `[SessionAutoCloseService] ✅ Encerramento automático concluído para inbox ${inboxId}: ` +
      `${closedCount}/${sessionsToClose.length} sessões encerradas, ` +
      `${redisKeysRemoved} chaves removidas do Redis`
    );

    return {
      inboxId,
      inboxName: inbox.inbox_name,
      autoCloseMinutes: inbox.auto_close_minutes,
      sessionsFound: sessionsToClose.length,
      sessionsClosed: closedCount,
      redisKeysRemoved,
    };
  }

  /**
   * Processa encerramento automático para todos os inboxes ativos
   * que têm auto_close_minutes configurado
   * 
   * @returns Resultado agregado do processamento
   */
  static async processAllInboxes(): Promise<{
    inboxesProcessed: number;
    inboxesWithAutoClose: number;
    totalSessionsClosed: number;
    totalRedisKeysRemoved: number;
    results: Array<{
      inboxId: number;
      inboxName: string | null;
      sessionsClosed: number;
    }>;
  }> {
    logger.info('[SessionAutoCloseService] 🚀 Iniciando processamento de encerramento automático para todos os inboxes');

    // Busca todos os inboxes ativos
    const activeInboxes = await InboxModel.findAll();
    const inboxesWithAutoClose = activeInboxes.filter(
      (inbox) => inbox.is_active && inbox.auto_close_minutes && inbox.auto_close_minutes > 0
    );

    logger.info(
      `[SessionAutoCloseService] 📋 Inboxes ativos: ${activeInboxes.length}, ` +
      `com auto-close configurado: ${inboxesWithAutoClose.length}`
    );

    let totalSessionsClosed = 0;
    let totalRedisKeysRemoved = 0;
    const results: Array<{
      inboxId: number;
      inboxName: string | null;
      sessionsClosed: number;
    }> = [];

    // Processa cada inbox com auto-close configurado
    for (const inbox of inboxesWithAutoClose) {
      try {
        const result = await this.closeExpiredSessionsForInbox(inbox.id);
        totalSessionsClosed += result.sessionsClosed;
        totalRedisKeysRemoved += result.redisKeysRemoved;
        
        results.push({
          inboxId: result.inboxId,
          inboxName: result.inboxName,
          sessionsClosed: result.sessionsClosed,
        });
      } catch (error: any) {
        logger.error(
          `[SessionAutoCloseService] ❌ Erro ao processar inbox ${inbox.id}: ${error.message}`
        );
      }
    }

    logger.info(
      `[SessionAutoCloseService] ✅ Processamento concluído: ` +
      `${inboxesWithAutoClose.length} inboxes processados, ` +
      `${totalSessionsClosed} sessões encerradas, ` +
      `${totalRedisKeysRemoved} chaves removidas do Redis`
    );

    return {
      inboxesProcessed: activeInboxes.length,
      inboxesWithAutoClose: inboxesWithAutoClose.length,
      totalSessionsClosed,
      totalRedisKeysRemoved,
      results,
    };
  }
}

