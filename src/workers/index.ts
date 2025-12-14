import { env } from '../config/env';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { ensureQueueConnection } from '../config/queue.config';
import logger from '../utils/logger.util';
import { webhookWorker } from './webhook.worker';
import { logWorker } from './log.worker';
import { chatwootNoteWorker } from './chatwoot-note.worker';

// Inicialização dos workers
async function start() {
  try {
    // Conecta ao Redis (cliente principal)
    await redis.connect();
    logger.info('Redis connected');

    // Conecta ao Redis para filas (BullMQ)
    await ensureQueueConnection();
    logger.info('Redis Queue connected');

    // Verifica conexão com banco
    await db.healthCheck();
    logger.info('Database connected');

    // Inicia workers
    logger.info('Workers iniciados');
    console.log('✅ Webhook Worker: Ativo');
    console.log(`   - Concurrency: ${process.env.WEBHOOK_WORKER_CONCURRENCY || '50'}`);
    console.log('✅ Log Worker: Ativo');
    console.log(`   - Concurrency: ${process.env.LOG_WORKER_CONCURRENCY || '20'}`);
    console.log('✅ Chatwoot Note Worker: Ativo');
    console.log(`   - Concurrency: ${process.env.CHATWOOT_NOTE_WORKER_CONCURRENCY || '20'}`);
  } catch (error) {
    logger.error('Failed to start workers', { error });
    console.error('❌ Erro ao iniciar workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers gracefully');
  await webhookWorker.close();
  await logWorker.close();
  await chatwootNoteWorker.close();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers gracefully');
  await webhookWorker.close();
  await logWorker.close();
  await chatwootNoteWorker.close();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

start();
