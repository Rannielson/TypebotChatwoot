import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.get('/db', async (req: Request, res: Response) => {
  try {
    const isHealthy = await db.healthCheck();
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'unhealthy',
      service: 'postgresql',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'postgresql',
      error: error.message,
    });
  }
});

router.get('/redis', async (req: Request, res: Response) => {
  try {
    const isHealthy = await redis.healthCheck();
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'unhealthy',
      service: 'redis',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'redis',
      error: error.message,
    });
  }
});

router.get('/full', async (req: Request, res: Response) => {
  const dbHealth = await db.healthCheck();
  const redisHealth = await redis.healthCheck();
  const allHealthy = dbHealth && redisHealth;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'unhealthy',
    services: {
      database: dbHealth ? 'ok' : 'unhealthy',
      redis: redisHealth ? 'ok' : 'unhealthy',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

