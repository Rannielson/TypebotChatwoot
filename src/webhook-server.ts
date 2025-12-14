import express, { Express } from 'express';
import { env } from './config/env';
import { redis } from './config/redis';
import logger from './utils/logger.util';

// Apenas rotas de webhook e health
import webhookRoutes from './routes/webhook.routes';
import healthRoutes from './routes/health.routes';

// Middleware
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app: Express = express();

// CORS simplificado para webhooks (aceita de qualquer origem)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apenas rotas de webhook e health
app.use('/webhook', webhookRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Inicialização
async function start() {
  try {
    // Conecta ao Redis (necessário para filas e cache)
    await redis.connect();
    logger.info('Redis connected');

    // Inicia servidor
    app.listen(env.port, () => {
      logger.info(`Webhook server started on port ${env.port}`);
      console.log(`📡 Webhook Server rodando na porta ${env.port}`);
      console.log(`📡 Webhook Chatwoot: http://localhost:${env.port}/webhook/chatwoot`);
      console.log(`❤️  Health Check: http://localhost:${env.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start webhook server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redis.disconnect();
  process.exit(0);
});

start();
