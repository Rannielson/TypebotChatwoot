import { Router, Request, Response } from 'express';
import { ChatwootRawWebhook } from '../types/chatwoot';
import { ChatwootNormalizer } from '../normalizers/chatwoot-normalizer';
import { webhookQueue } from '../config/queue.config';
import { SessionService } from '../services/session.service';
import { CacheService } from '../services/cache.service';
import { LockService } from '../services/lock.service';

const router = Router();

router.post('/chatwoot', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Validação rápida (sem logs excessivos em produção)
    // Log apenas para debug - remover em produção para performance
    let rawWebhook: ChatwootRawWebhook;
    
    if (req.body.body && typeof req.body.body === 'object') {
      rawWebhook = req.body as ChatwootRawWebhook;
    } else if (req.body.event) {
      rawWebhook = {
        headers: req.headers as Record<string, string>,
        params: {},
        query: {},
        body: req.body,
        webhookUrl: req.body.webhookUrl,
        executionMode: req.body.executionMode,
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Estrutura de payload inválida',
      });
    }

    if (!ChatwootNormalizer.isValid(rawWebhook)) {
      return res.status(400).json({
        success: false,
        error: 'Webhook inválido ou mensagem de saída',
      });
    }

    const event = ChatwootNormalizer.detectEvent(rawWebhook);

    switch (event.type) {
      case 'message': {
        const normalizedMessage = event.data;
        
        // Validação rápida: verifica se inbox existe (cache)
        const inbox = await CacheService.getInbox(normalizedMessage.inbox_id);
        if (!inbox) {
          return res.status(404).json({
            success: false,
            error: `Configuração não encontrada para inbox ${normalizedMessage.inbox_id}`,
          });
        }

        // Cria jobId único baseado no message_id para evitar duplicatas
        const jobId = `msg-${normalizedMessage.inbox_id}-${normalizedMessage.message.message_id}`;
        
        // Lock na criação do job para evitar que múltiplas réplicas criem o mesmo job
        // TTL curto (5s padrão) pois a criação do job é muito rápida
        const lockKey = `job-create-${normalizedMessage.inbox_id}-${normalizedMessage.message.message_id}`;
        const lockTtl = parseInt(process.env.WEBHOOK_JOB_CREATE_LOCK_TTL || '5000', 10);
        const lock = await LockService.acquireLock(lockKey, lockTtl);
        
        if (!lock) {
          // Outra réplica já está criando este job, retorna sucesso
          const responseTime = Date.now() - startTime;
          console.log(`[WebhookAPI] ⚠️ Job ${jobId} já está sendo criado por outra réplica (response: ${responseTime}ms)`);
          return res.status(200).json({
            success: true,
            event: 'already_queued',
            queued_at: new Date().toISOString(),
            response_time_ms: responseTime,
          });
        }

        try {
          // Adiciona job na fila de ALTA PRIORIDADE e responde imediatamente
          // Se jobId já existe, não cria duplicata (comportamento padrão do BullMQ)
          await webhookQueue.add(
            'process-message',
            { normalizedMessage },
            {
              priority: 1, // Prioridade máxima
              jobId, // JobId único evita duplicatas
              removeOnComplete: true,
            }
          );

          // Resposta IMEDIATA ao Chatwoot (<50ms)
          const responseTime = Date.now() - startTime;
          console.log(`[WebhookAPI] ✅ Job criado: ${jobId} (response: ${responseTime}ms)`);
          return res.status(200).json({
            success: true,
            event: 'message_queued',
            queued_at: new Date().toISOString(),
            response_time_ms: responseTime,
          });
        } finally {
          // Libera o lock após criar o job
          await LockService.releaseLock(lock);
        }
      }

      case 'conversation_resolved': {
        const { accountId, inboxId, conversationId } = event.data;
        const inbox = await CacheService.getInbox(inboxId);
        
        if (!inbox) {
          return res.status(404).json({
            success: false,
            error: `Inbox ${inboxId} não encontrado`,
          });
        }

        // Processa fechamento de sessão (rápido, pode ser síncrono)
        await SessionService.closeSession(inbox.tenant_id, inbox.id, conversationId);

        return res.status(200).json({
          success: true,
          event: 'conversation_closed',
        });
      }

      case 'conversation_updated': {
        res.status(200).json({
          success: true,
          event: 'conversation_updated',
        });
        break;
      }

      default:
        res.status(200).json({
          success: true,
          event: 'unknown',
          message: 'Evento não processado',
        });
    }
  } catch (error: any) {
    console.error('Erro no webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

