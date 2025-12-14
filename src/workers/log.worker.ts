import { Worker } from 'bullmq';
import { queueConnection } from '../config/queue.config';
import { LoggerService } from '../services/logger.service';

export const logWorker = new Worker(
  'message-logging',
  async (job) => {
    const { type, data } = job.data;
    
    if (type === 'log-incoming') {
      await LoggerService.logIncomingMessage(
        data.sessionId,
        data.content,
        data.contentType,
        data.chatwootMessageId,
        data.attachments
      );
    } else if (type === 'log-outgoing') {
      await LoggerService.logOutgoingMessage(
        data.sessionId,
        data.content,
        data.contentType,
        data.whatsappMessageId,
        data.typebotResponse
      );
    }
  },
  {
    connection: queueConnection,
    concurrency: parseInt(process.env.LOG_WORKER_CONCURRENCY || '20', 10), // Processa 20 logs em paralelo
  }
);

logWorker.on('completed', (job) => {
  // Logs silenciosos para não poluir
});

logWorker.on('failed', (job, err) => {
  console.error(`[LogWorker] Job ${job?.id} falhou:`, err.message);
});
