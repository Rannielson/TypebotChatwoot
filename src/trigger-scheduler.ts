import { env } from './config/env';
import { db } from './config/database';
import { redis } from './config/redis';
import logger from './utils/logger.util';
import { TriggerScheduler } from './schedulers/trigger.scheduler';
import { SessionAutoCloseScheduler } from './schedulers/session-auto-close.scheduler';
import { SessionBulkCloseScheduler } from './schedulers/session-bulk-close.scheduler';

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
    
    // Inicia scheduler de encerramento automático de sessões
    await SessionAutoCloseScheduler.initialize();
    logger.info('Session auto-close scheduler initialized');
    
    // Inicia scheduler de encerramento em massa de sessões
    await SessionBulkCloseScheduler.initialize();
    logger.info('Session bulk-close scheduler initialized');
    
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
    console.log('');
    console.log('🔄 Session Auto-Close Scheduler iniciado com sucesso');
    const sessionAutoCloseStatus = SessionAutoCloseScheduler.getStatus();
    console.log(`   - Verificação de sessões expiradas a cada ${sessionAutoCloseStatus.checkIntervalMinutes} minuto(s)`);
    console.log('   - Sessões serão encerradas automaticamente conforme configurado em cada inbox');
    console.log('');
    console.log('📦 Session Bulk-Close Scheduler iniciado com sucesso');
    const bulkCloseStatus = SessionBulkCloseScheduler.getStatus();
    console.log(`   - Intervalos agendados: ${bulkCloseStatus.activeJobs}`);
    if (bulkCloseStatus.intervals.length > 0) {
      console.log('   - Intervalos configurados:');
      bulkCloseStatus.intervals.forEach((interval) => {
        console.log(`     • ${interval.intervalHours}h: ${interval.inboxCount} inbox(es) (${interval.cronExpression})`);
      });
    } else {
      console.log('   - Nenhum intervalo configurado ainda');
      console.log('   - Configure auto_close_bulk_interval_hours nos inboxes para ativar');
    }
  } catch (error) {
    logger.error('Failed to start trigger scheduler', { error });
    console.error('❌ Erro ao iniciar trigger scheduler:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down schedulers gracefully');
  TriggerScheduler.stop();
  SessionAutoCloseScheduler.stop();
  SessionBulkCloseScheduler.stop();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down schedulers gracefully');
  TriggerScheduler.stop();
  SessionAutoCloseScheduler.stop();
  SessionBulkCloseScheduler.stop();
  await redis.disconnect();
  await db.close();
  process.exit(0);
});

start();
