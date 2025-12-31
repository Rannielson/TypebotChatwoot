import { redis } from '../config/redis';
import { NormalizedChatwootMessage } from '../types/chatwoot';
import logger from '../utils/logger.util';

export class MessageDeduplicationService {
  private static readonly PROCESSED_KEY_PREFIX = 'msg-processed';
  private static readonly DEFAULT_TTL = 3600; // 1 hora - tempo suficiente para evitar duplicatas

  /**
   * Gera chave única para mensagem processada baseado em inbox_id e message_id
   */
  private static getProcessedKey(
    inboxId: number,
    messageId: string
  ): string {
    return `${this.PROCESSED_KEY_PREFIX}:${inboxId}:${messageId}`;
  }

  /**
   * Verifica se a mensagem já foi processada
   * @returns true se já foi processada, false caso contrário
   */
  static async isAlreadyProcessed(
    normalizedMessage: NormalizedChatwootMessage
  ): Promise<boolean> {
    const inboxId = normalizedMessage.inbox_id;
    const messageId = normalizedMessage.message.message_id;

    if (!messageId) {
      // Se não tem message_id, não pode deduplicar
      logger.warn(
        `[MessageDeduplicationService] Mensagem sem message_id, não é possível deduplicar`,
        { inboxId }
      );
      return false;
    }

    const key = this.getProcessedKey(inboxId, messageId);
    const exists = await redis.exists(key);

    if (exists) {
      logger.debug(
        `[MessageDeduplicationService] Mensagem já processada: inbox=${inboxId}, message_id=${messageId}`
      );
      return true;
    }

    return false;
  }

  /**
   * Marca mensagem como processada
   */
  static async markAsProcessed(
    normalizedMessage: NormalizedChatwootMessage
  ): Promise<void> {
    const inboxId = normalizedMessage.inbox_id;
    const messageId = normalizedMessage.message.message_id;

    if (!messageId) {
      logger.warn(
        `[MessageDeduplicationService] Tentativa de marcar mensagem sem message_id como processada`,
        { inboxId }
      );
      return;
    }

    const key = this.getProcessedKey(inboxId, messageId);
    const ttl = parseInt(process.env.MESSAGE_DEDUP_TTL || String(this.DEFAULT_TTL), 10);

    try {
      // Usa SET com NX (only if Not eXists) para garantir atomicidade
      // Se a chave já existe, não sobrescreve
      await redis.set(key, '1', ttl);
      logger.debug(
        `[MessageDeduplicationService] Mensagem marcada como processada: inbox=${inboxId}, message_id=${messageId}, ttl=${ttl}s`
      );
    } catch (error: any) {
      logger.error(
        `[MessageDeduplicationService] Erro ao marcar mensagem como processada: ${error.message}`,
        { error, inboxId, messageId }
      );
      // Não lança erro para não interromper o fluxo principal
    }
  }

  /**
   * Verifica e marca mensagem como processada atomicamente
   * @returns true se já estava processada, false se foi marcada agora
   */
  static async checkAndMark(
    normalizedMessage: NormalizedChatwootMessage
  ): Promise<boolean> {
    const inboxId = normalizedMessage.inbox_id;
    const messageId = normalizedMessage.message.message_id;

    if (!messageId) {
      logger.warn(
        `[MessageDeduplicationService] Mensagem sem message_id, não é possível deduplicar`,
        { inboxId }
      );
      return false;
    }

    const key = this.getProcessedKey(inboxId, messageId);
    const ttl = parseInt(process.env.MESSAGE_DEDUP_TTL || String(this.DEFAULT_TTL), 10);

    try {
      // Tenta criar a chave com SET NX (only if Not eXists)
      // Retorna true se criou (não existia), false se já existia
      const created = await redis.setNX(key, '1', ttl);
      
      if (!created) {
        // Chave já existia - mensagem já foi processada
        logger.debug(
          `[MessageDeduplicationService] Mensagem já estava processada: inbox=${inboxId}, message_id=${messageId}`
        );
        return true; // Já estava processada
      } else {
        // Chave foi criada agora (não existia antes)
        logger.debug(
          `[MessageDeduplicationService] Mensagem marcada como processada (nova): inbox=${inboxId}, message_id=${messageId}`
        );
        return false; // Não estava processada antes
      }
    } catch (error: any) {
      logger.error(
        `[MessageDeduplicationService] Erro ao verificar/marcar mensagem: ${error.message}`,
        { error, inboxId, messageId }
      );
      // Em caso de erro, retorna false para processar (melhor processar duplicado que perder mensagem)
      return false;
    }
  }

  /**
   * Remove marcação de processada (útil para testes ou reprocessamento manual)
   */
  static async unmarkAsProcessed(
    inboxId: number,
    messageId: string
  ): Promise<void> {
    const key = this.getProcessedKey(inboxId, messageId);
    await redis.del(key);
    logger.debug(
      `[MessageDeduplicationService] Marcação removida: inbox=${inboxId}, message_id=${messageId}`
    );
  }
}
