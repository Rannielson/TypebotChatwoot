import { Worker, Job } from 'bullmq';
import { queueConnection } from '../config/queue.config';
import { MessageHandler } from '../handlers/message.handler';
import { CacheService } from '../services/cache.service';
import { LockService } from '../services/lock.service';
import { MessageDeduplicationService } from '../services/message-deduplication.service';
import { Inbox } from '../models/inbox.model';

const messageHandler = new MessageHandler();

// Worker dedicado para processar webhooks (ALTA PRIORIDADE)
export const webhookWorker = new Worker(
  'webhook-processing',
  async (job: Job) => {
    const { normalizedMessage, bufferedMessages, bufferSize } = job.data;
    const startTime = Date.now();
    
    // Se há mensagens agrupadas do buffer, processa apenas a primeira
    // Isso evita múltiplas respostas para múltiplas imagens/mensagens
    const messageToProcess = normalizedMessage;
    const isBuffered = !!(bufferedMessages && bufferSize && bufferSize > 1);
    
    if (isBuffered) {
      console.log(
        `[Worker] 📦 Processando mensagem agrupada do buffer: ` +
        `${bufferSize} mensagem(ns) agrupadas, processando apenas a primeira`
      );
    }
    
    // Verifica se mensagem já foi processada (deduplicação adicional no worker)
    const alreadyProcessed = await MessageDeduplicationService.isAlreadyProcessed(messageToProcess);
    if (alreadyProcessed) {
      console.log(
        `[Worker] ⚠️ Mensagem já processada anteriormente: ` +
        `inbox=${messageToProcess.inbox_id}, ` +
        `message_id=${messageToProcess.message.message_id}, ` +
        `job=${job.id}`
      );
      return {
        success: false,
        skipped: true,
        reason: 'already_processed',
      };
    }

    // Cria chave única do lock baseada no message_id
    const lockKey = `webhook-${messageToProcess.inbox_id}-${messageToProcess.message.message_id}`;
    
    // Tenta adquirir lock (TTL configurável, padrão: 60s - tempo máximo de processamento)
    const lockTtl = parseInt(process.env.WEBHOOK_LOCK_TTL || '60000', 10);
    const lock = await LockService.acquireLock(lockKey, lockTtl);
    
    if (!lock) {
      // Lock já está em uso - outro worker está processando este job
      console.log(`[Worker] Job ${job.id} já está sendo processado por outro worker, pulando...`);
      return {
        success: false,
        skipped: true,
        reason: 'already_processing',
      };
    }

    try {
      // Busca inbox do cache (rápido)
      const inbox = await CacheService.getInbox(messageToProcess.inbox_id);
      if (!inbox) {
        throw new Error(`Inbox ${messageToProcess.inbox_id} não encontrado`);
      }

      // Processa mensagem (otimizado)
      // Se há mensagens agrupadas, processa apenas a primeira para evitar múltiplas respostas
      await messageHandler.handleMessage(messageToProcess, inbox);
      
      // Marca mensagem como processada APENAS DEPOIS de processar com sucesso
      // Isso garante que se houver erro, a mensagem pode ser reprocessada
      await MessageDeduplicationService.markAsProcessed(messageToProcess);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Worker] ✅ Mensagem processada e marcada como processada: inbox=${messageToProcess.inbox_id}, message_id=${messageToProcess.message.message_id}`);
      
      return { 
        success: true, 
        inboxId: inbox.id,
        processingTimeMs: processingTime,
        buffered: isBuffered,
        bufferSize: bufferSize || 1,
      };
    } catch (error: any) {
      console.error(`[Worker] ❌ Erro ao processar job ${job.id}:`, error);
      // Não marca como processada em caso de erro, permitindo reprocessamento
      throw error;
    } finally {
      // Sempre libera o lock, mesmo em caso de erro
      await LockService.releaseLock(lock);
    }
  },
  {
    connection: queueConnection,
    concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '50', 10), // Processa 50 jobs em paralelo por worker
    limiter: {
      max: 500, // Máximo 500 jobs por segundo
      duration: 1000,
    },
  }
);

webhookWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completado em ${job.returnvalue?.processingTimeMs}ms`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou:`, err.message);
});

webhookWorker.on('error', (err) => {
  console.error('[Worker] Erro no worker:', err);
});
