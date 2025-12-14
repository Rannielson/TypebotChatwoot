import express, { Express } from 'express';
import { env } from './config/env';
import { db } from './config/database';
import { redis } from './config/redis';
import logger from './utils/logger.util';

// Routes
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import inboxRoutes from './routes/inbox.routes';
import sessionRoutes from './routes/session.routes';
import healthRoutes from './routes/health.routes';

// Middleware
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app: Express = express();

// CORS - Permitir requisições do frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/inboxes', inboxRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Inicialização
async function start() {
  try {
    // Conecta ao Redis
    await redis.connect();
    logger.info('Redis connected');

    // Verifica conexão com banco
    await db.healthCheck();
    logger.info('Database connected');

    // Inicia servidor
    app.listen(env.port, () => {
      logger.info(`Server started on port ${env.port}`);
      console.log(`🚀 API Server rodando na porta ${env.port}`);
      console.log(`🔐 API Auth: http://localhost:${env.port}/api/auth`);
      console.log(`🏢 API Tenants: http://localhost:${env.port}/api/tenants`);
      console.log(`📬 API Inboxes: http://localhost:${env.port}/api/inboxes`);
      console.log(`💬 API Sessions: http://localhost:${env.port}/api/sessions`);
      console.log(`❤️  Health Check: http://localhost:${env.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

start();

