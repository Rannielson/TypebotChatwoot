import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';

// Conexão Redis otimizada para BullMQ
export const queueConnection = new IORedis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  // Habilita fila offline para permitir enfileiramento quando Redis estiver offline
  enableOfflineQueue: true,
  // Retry strategy - reconecta automaticamente
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Tentando reconectar (tentativa ${times}) em ${delay}ms...`);
    return delay;
  },
  // Reconexão automática
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconecta quando o Redis está em modo read-only
      return true;
    }
    return false;
  },
});

// Eventos de conexão para monitoramento
queueConnection.on('connect', () => {
  console.log('[Redis Queue] Conectado ao Redis');
});

queueConnection.on('ready', () => {
  console.log('[Redis Queue] Redis está pronto para receber comandos');
});

queueConnection.on('error', (err) => {
  console.error('[Redis Queue] Erro na conexão:', err.message);
});

queueConnection.on('close', () => {
  console.log('[Redis Queue] Conexão fechada');
});

queueConnection.on('reconnecting', () => {
  console.log('[Redis Queue] Reconectando...');
});

// Função para garantir que a conexão está estabelecida
export async function ensureQueueConnection(): Promise<void> {
  if (queueConnection.status !== 'ready' && queueConnection.status !== 'connect') {
    try {
      await queueConnection.connect();
      console.log('[Redis Queue] Conexão estabelecida com sucesso');
    } catch (error: any) {
      console.error('[Redis Queue] Erro ao conectar:', error.message);
      throw error;
    }
  }
}

// Fila principal: processamento de webhooks (ALTA PRIORIDADE)
export const webhookQueue = new Queue('webhook-processing', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: {
      age: 3600, // Manter por 1 hora
      count: 10000, // Manter últimos 10k
    },
    removeOnFail: {
      age: 86400, // Manter falhas por 24 horas
      count: 5000,
    },
  },
});

// Fila secundária: logs (baixa prioridade)
export const messageLogQueue = new Queue('message-logging', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: {
      age: 86400,
    },
  },
});

// Fila secundária: notas do Chatwoot (baixa prioridade)
export const chatwootNoteQueue = new Queue('chatwoot-notes', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: {
      age: 86400,
    },
  },
});
