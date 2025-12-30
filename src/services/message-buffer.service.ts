import { redis } from '../config/redis';
import { NormalizedChatwootMessage } from '../types/chatwoot';
import logger from '../utils/logger.util';
import { webhookQueue } from '../config/queue.config';

interface BufferedMessage {
  normalizedMessage: NormalizedChatwootMessage;
  timestamp: number;
}

interface MessageBuffer {
  messages: BufferedMessage[];
  lastUpdate: number;
  processing: boolean;
}

export class MessageBufferService {
  private static readonly BUFFER_KEY_PREFIX = 'msg-buffer';
  private static readonly DEFAULT_BUFFER_TIMEOUT_MS = 3000; // 3 segundos
  private static readonly MAX_BUFFER_SIZE = 10; // Máximo de mensagens no buffer
  private static processingTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Gera chave única para o buffer baseado em inbox_id, conversation_id e phone_number
   */
  private static getBufferKey(
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): string {
    return `${this.BUFFER_KEY_PREFIX}:${inboxId}:${conversationId}:${phoneNumber}`;
  }

  /**
   * Adiciona uma mensagem ao buffer e agenda processamento após timeout
   */
  static async addMessage(
    normalizedMessage: NormalizedChatwootMessage
  ): Promise<{ buffered: boolean; bufferSize: number }> {
    const conversationId = parseInt(normalizedMessage.message.chat_id);
    const phoneNumber = normalizedMessage.message.remotejid;
    const inboxId = normalizedMessage.inbox_id;

    const bufferKey = this.getBufferKey(inboxId, conversationId, phoneNumber);
    const bufferTimeout = parseInt(
      process.env.MESSAGE_BUFFER_TIMEOUT_MS || String(this.DEFAULT_BUFFER_TIMEOUT_MS),
      10
    );

    try {
      // Busca buffer existente
      const existingBuffer = await redis.get(bufferKey);
      let buffer: MessageBuffer;

      if (existingBuffer) {
        buffer = JSON.parse(existingBuffer);
      } else {
        buffer = {
          messages: [],
          lastUpdate: Date.now(),
          processing: false,
        };
      }

      // Verifica se já está processando
      if (buffer.processing) {
        logger.debug(
          `[MessageBufferService] Buffer já está sendo processado para ${bufferKey}, adicionando mensagem ao buffer`
        );
      }

      // Adiciona mensagem ao buffer
      buffer.messages.push({
        normalizedMessage,
        timestamp: Date.now(),
      });
      buffer.lastUpdate = Date.now();

      // Limita tamanho do buffer
      if (buffer.messages.length > this.MAX_BUFFER_SIZE) {
        logger.warn(
          `[MessageBufferService] Buffer excedeu tamanho máximo (${this.MAX_BUFFER_SIZE}), removendo mensagens mais antigas`
        );
        // Mantém apenas as mensagens mais recentes
        buffer.messages = buffer.messages.slice(-this.MAX_BUFFER_SIZE);
      }

      // Salva buffer no Redis com TTL maior que o timeout
      await redis.set(
        bufferKey,
        JSON.stringify(buffer),
        Math.ceil(bufferTimeout / 1000) + 10 // TTL em segundos
      );

      // Cancela timer anterior se existir
      const existingTimer = this.processingTimers.get(bufferKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.processingTimers.delete(bufferKey);
      }

      // Agenda processamento após timeout
      const timer = setTimeout(async () => {
        await this.processBuffer(bufferKey, inboxId, conversationId, phoneNumber);
        this.processingTimers.delete(bufferKey);
      }, bufferTimeout);

      this.processingTimers.set(bufferKey, timer);

      logger.debug(
        `[MessageBufferService] Mensagem adicionada ao buffer: ${bufferKey} ` +
        `(${buffer.messages.length} mensagem(ns) no buffer, timeout: ${bufferTimeout}ms)`
      );

      return {
        buffered: true,
        bufferSize: buffer.messages.length,
      };
    } catch (error: any) {
      logger.error(
        `[MessageBufferService] Erro ao adicionar mensagem ao buffer: ${error.message}`,
        { error }
      );
      // Em caso de erro, retorna false para processar imediatamente
      return {
        buffered: false,
        bufferSize: 0,
      };
    }
  }

  /**
   * Processa todas as mensagens do buffer de uma vez
   */
  static async processBuffer(
    bufferKey: string,
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<void> {
    try {
      // Busca buffer
      const bufferData = await redis.get(bufferKey);
      if (!bufferData) {
        logger.debug(`[MessageBufferService] Buffer ${bufferKey} não encontrado, já foi processado`);
        return;
      }

      const buffer: MessageBuffer = JSON.parse(bufferData);

      // Marca como processando
      buffer.processing = true;
      await redis.set(bufferKey, JSON.stringify(buffer), 60); // TTL de 60s durante processamento

      if (buffer.messages.length === 0) {
        logger.debug(`[MessageBufferService] Buffer ${bufferKey} vazio, removendo`);
        await redis.del(bufferKey);
        return;
      }

      logger.info(
        `[MessageBufferService] 🚀 Processando buffer: ${bufferKey} ` +
        `(${buffer.messages.length} mensagem(ns) agrupadas)`
      );

      // Ordena mensagens por timestamp
      buffer.messages.sort((a, b) => a.timestamp - b.timestamp);

      // Processa apenas a primeira mensagem (ou todas se necessário)
      // A estratégia é: processar apenas a primeira mensagem do grupo
      // Isso evita múltiplas respostas para múltiplas imagens
      const firstMessage = buffer.messages[0].normalizedMessage;

      // Cria job único para processar o grupo de mensagens
      const jobId = `msg-buffered-${inboxId}-${conversationId}-${phoneNumber}-${Date.now()}`;
      
      await webhookQueue.add(
        'process-message',
        {
          normalizedMessage: firstMessage,
          bufferedMessages: buffer.messages.map(m => m.normalizedMessage),
          bufferSize: buffer.messages.length,
        },
        {
          priority: 1,
          jobId,
          removeOnComplete: true,
        }
      );

      logger.info(
        `[MessageBufferService] ✅ Buffer processado: ${bufferKey} ` +
        `(${buffer.messages.length} mensagem(ns) agrupadas em 1 job)`
      );

      // Remove buffer após processar
      await redis.del(bufferKey);
    } catch (error: any) {
      logger.error(
        `[MessageBufferService] ❌ Erro ao processar buffer ${bufferKey}: ${error.message}`,
        { error }
      );
      
      // Tenta remover buffer mesmo em caso de erro
      try {
        await redis.del(bufferKey);
      } catch (delError) {
        logger.error(`[MessageBufferService] Erro ao remover buffer após erro: ${delError}`);
      }
    }
  }

  /**
   * Força processamento imediato do buffer (útil para mensagens de texto)
   */
  static async flushBuffer(
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<void> {
    const bufferKey = this.getBufferKey(inboxId, conversationId, phoneNumber);
    
    // Cancela timer se existir
    const timer = this.processingTimers.get(bufferKey);
    if (timer) {
      clearTimeout(timer);
      this.processingTimers.delete(bufferKey);
    }

    // Processa imediatamente
    await this.processBuffer(bufferKey, inboxId, conversationId, phoneNumber);
  }

  /**
   * Limpa buffer manualmente (útil para cleanup)
   */
  static async clearBuffer(
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<void> {
    const bufferKey = this.getBufferKey(inboxId, conversationId, phoneNumber);
    
    // Cancela timer se existir
    const timer = this.processingTimers.get(bufferKey);
    if (timer) {
      clearTimeout(timer);
      this.processingTimers.delete(bufferKey);
    }

    // Remove buffer
    await redis.del(bufferKey);
    logger.debug(`[MessageBufferService] Buffer ${bufferKey} limpo manualmente`);
  }
}
