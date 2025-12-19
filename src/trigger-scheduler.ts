import { env } from './config/env';
import { db } from './config/database';
import { redis } from './config/redis';
import logger from './utils/logger.util';
import { TriggerScheduler } from './schedulers/trigger.scheduler';

// Inicialização do Trigger Scheduler
async function start() {
  try {
    // Conecta ao Redis
    await redis.connect();
    logger.info('Redis connected');

    // Verifica conexão com banco
    await db.healthCheck();
    logger.info('Database connected');

    // Inicia scheduler de triggers
    await TriggerScheduler.initialize();
    logger.info('Trigger scheduler initialized');
    
    console.log('⚡ Trigger Scheduler iniciado com sucesso');
    console.log('   - Verificando triggers ativos...');
    
    const status = TriggerScheduler.getStatus();
    
    if (status.useOptimizedMode) {
      // Modo otimizado: mostra frequencyJobs
      console.log(`   - Frequências agendadas: ${status.frequencyJobs}`);
      
      if (status.frequencyJobs > 0) {
        console.log('   - Frequências agendadas:');
        status.frequencies.forEach((freq) => {
          console.log(`     • ${freq.frequencyMinutes}min: ${freq.cronExpression}`);
        });
      } else {
        console.log('   - Nenhum trigger ativo encontrado');
        console.log('   - Verifique se há triggers ativos no banco e se estão associados a inboxes');
      }
    } else {
      // Modo legacy: mostra activeJobs
      console.log(`   - Triggers agendados: ${status.activeJobs}`);
      
      if (status.activeJobs > 0) {
        console.log('   - Jobs agendados:');
        status.jobs.forEach((job) => {
          console.log(`     • Trigger ${job.triggerId}: ${job.cronExpression}`);
        });
      } else {
        console.log('   - Nenhum trigger ativo encontrado');
        console.log('   - Verifique se há triggers ativos no banco e se estão associados a inboxes');
      }
    }
    
    console.log('   - Verificação periódica ativa (a cada 1 minuto)');
    console.log('   - Novos triggers serão detectados automaticamente');
  } catch (error) {
    logger.error('Failed to start trigger scheduler', { error });
    console.error('❌ Erro ao iniciar trigger scheduler:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down trigger scheduler gracefully');
  TriggerScheduler.stop();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down trigger scheduler gracefully');
  TriggerScheduler.stop();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

start();
