import { Router, Request, Response } from 'express';
import { ChatwootRawWebhook } from '../types/chatwoot';
import { ChatwootNormalizer } from '../normalizers/chatwoot-normalizer';
import { webhookQueue } from '../config/queue.config';
import { SessionService } from '../services/session.service';
import { SessionModel } from '../models/session.model';
import { CacheService } from '../services/cache.service';
import { LockService } from '../services/lock.service';
import { MessageBufferService } from '../services/message-buffer.service';
import { MessageDeduplicationService } from '../services/message-deduplication.service';

const router = Router();

router.post('/chatwoot', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Log do webhook recebido para debug
    console.log('[WebhookAPI] 📥 Webhook recebido:', {
      event: req.body.event || req.body.body?.event,
      hasMessages: !!(req.body.messages || req.body.body?.messages),
      messageCount: req.body.messages?.length || req.body.body?.messages?.length || 0,
      message_type: req.body.messages?.[0]?.message_type || req.body.body?.messages?.[0]?.message_type,
      message_id: req.body.messages?.[0]?.id || req.body.body?.messages?.[0]?.id,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'host': req.headers['host'],
      },
    });

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
      console.log('[WebhookAPI] ❌ Estrutura de payload inválida');
      return res.status(400).json({
        success: false,
        error: 'Estrutura de payload inválida',
      });
    }

    if (!ChatwootNormalizer.isValid(rawWebhook)) {
      const responseTime = Date.now() - startTime;
      console.log(`[WebhookAPI] ❌ Webhook inválido ou mensagem de saída (response: ${responseTime}ms)`);
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

        // Verifica se deve pausar a sessão (team ou assignee atribuído)
        const pauseData = ChatwootNormalizer.shouldPauseSession(rawWebhook);
        if (pauseData) {
          console.log(`[WebhookAPI] ⏸️ Detectado team/assignee atribuído, verificando se precisa pausar sessão:`, {
            accountId: pauseData.accountId,
            inboxId: pauseData.inboxId,
            conversationId: pauseData.conversationId,
          });

          // Verifica se já existe sessão pausada (evita pausar novamente)
          const existingPausedSession = await SessionModel.findByStatus(
            inbox.tenant_id,
            inbox.id,
            pauseData.conversationId,
            pauseData.phoneNumber,
            'paused'
          );

          if (!existingPausedSession) {
            // Pausa a sessão apenas se ainda não estiver pausada
            const pausedCount = await SessionService.pauseSessionByConversation(
              inbox.tenant_id,
              inbox.id,
              pauseData.conversationId
            );
            console.log(`[WebhookAPI] ✅ Sessão pausada (${pausedCount} sessões pausadas)`);
          } else {
            console.log(`[WebhookAPI] ℹ️ Sessão já estava pausada, mantendo status`);
          }

          // Não enfileira a mensagem - bot está pausado
          const responseTime = Date.now() - startTime;
          return res.status(200).json({
            success: true,
            event: 'session_paused',
            message: 'Sessão pausada devido a team/assignee atribuído',
            queued_at: new Date().toISOString(),
            response_time_ms: responseTime,
          });
        } else {
          // Não há condições de pausa, mas verifica se a sessão está pausada e precisa ser retomada
          const conversationId = parseInt(normalizedMessage.message.chat_id);
          const phoneNumber = normalizedMessage.message.remotejid;
          
          const pausedSession = await SessionModel.findByStatus(
            inbox.tenant_id,
            inbox.id,
            conversationId,
            phoneNumber,
            'paused'
          );

          if (pausedSession) {
            console.log(`[WebhookAPI] 🔄 Team/assignee removido, retomando sessão pausada:`, {
              conversationId,
              phoneNumber,
              sessionId: pausedSession.id,
            });

            const resumedCount = await SessionService.resumeSessionByConversation(
              inbox.tenant_id,
              inbox.id,
              conversationId
            );
            console.log(`[WebhookAPI] ✅ Sessão retomada (${resumedCount} sessões retomadas)`);
          }
        }

        // Verifica se mensagem já foi processada (deduplicação)
        // IMPORTANTE: Apenas verifica, não marca ainda (marcação acontece no worker após processar com sucesso)
        console.log(`[WebhookAPI] 🔍 Verificando deduplicação:`, {
          inbox_id: normalizedMessage.inbox_id,
          message_id: normalizedMessage.message.message_id,
          conversation_id: normalizedMessage.message.chat_id,
          phone: normalizedMessage.message.remotejid,
        });
        
        const alreadyProcessed = await MessageDeduplicationService.isAlreadyProcessed(normalizedMessage);
        
        console.log(`[WebhookAPI] 🔍 Resultado da verificação de deduplicação:`, {
          alreadyProcessed,
          inbox_id: normalizedMessage.inbox_id,
          message_id: normalizedMessage.message.message_id,
        });
        
        if (alreadyProcessed) {
          const responseTime = Date.now() - startTime;
          console.log(
            `[WebhookAPI] ⚠️⚠️⚠️ DUPLICATA DETECTADA - Mensagem já processada anteriormente: ` +
            `inbox=${normalizedMessage.inbox_id}, ` +
            `message_id=${normalizedMessage.message.message_id} ` +
            `(response: ${responseTime}ms)`
          );
          return res.status(200).json({
            success: true,
            event: 'already_processed',
            message: 'Mensagem já foi processada anteriormente',
            queued_at: new Date().toISOString(),
            response_time_ms: responseTime,
          });
        }
        
        console.log(`[WebhookAPI] ✅ Mensagem nova, prosseguindo com processamento`);

        // Verifica se deve usar buffer (mensagens com anexos ou múltiplas mensagens rápidas)
        const hasAttachments = !!(normalizedMessage.attachments && normalizedMessage.attachments.length > 0);
        const useBuffer = hasAttachments || process.env.USE_MESSAGE_BUFFER === 'true';

        if (useBuffer) {
          // Adiciona mensagem ao buffer
          const bufferResult = await MessageBufferService.addMessage(normalizedMessage);
          
          const responseTime = Date.now() - startTime;
          console.log(
            `[WebhookAPI] 📦 Mensagem adicionada ao buffer: ` +
            `inbox=${normalizedMessage.inbox_id}, ` +
            `conversation=${normalizedMessage.message.chat_id}, ` +
            `bufferSize=${bufferResult.bufferSize} ` +
            `(response: ${responseTime}ms)`
          );
          
          return res.status(200).json({
            success: true,
            event: 'message_buffered',
            buffered: bufferResult.buffered,
            buffer_size: bufferResult.bufferSize,
            queued_at: new Date().toISOString(),
            response_time_ms: responseTime,
          });
        } else {
          // Processa mensagem imediatamente (texto sem anexos)
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
        // Verifica se deve pausar a sessão (team ou assignee atribuído)
        const pauseData = ChatwootNormalizer.shouldPauseSession(rawWebhook);
        if (pauseData) {
          console.log(`[WebhookAPI] ⏸️ conversation_updated: Detectado team/assignee atribuído, pausando sessão:`, {
            accountId: pauseData.accountId,
            inboxId: pauseData.inboxId,
            conversationId: pauseData.conversationId,
          });

          // Busca inbox para obter tenant_id
          const inbox = await CacheService.getInbox(pauseData.inboxId);
          if (!inbox) {
            console.warn(`[WebhookAPI] Inbox ${pauseData.inboxId} não encontrado para pausar sessão`);
            return res.status(200).json({
              success: true,
              event: 'conversation_updated',
              message: 'Inbox não encontrado',
            });
          }

          // Pausa a sessão
          await SessionService.pauseSessionByConversation(
            inbox.tenant_id,
            inbox.id,
            pauseData.conversationId
          );

          return res.status(200).json({
            success: true,
            event: 'conversation_updated',
            session_paused: true,
            message: 'Sessão pausada devido a team/assignee atribuído',
          });
        } else {
          // Não há condições de pausa, verifica se precisa retomar sessão pausada
          // Extrai dados básicos do webhook para verificar sessão
          const accountId =
            rawWebhook.body.messages?.[0]?.account_id ||
            rawWebhook.body.account?.id ||
            (rawWebhook.body.meta?.sender as any)?.account?.id ||
            0;
          const inboxId =
            rawWebhook.body.inbox_id ||
            rawWebhook.body.inbox?.id ||
            rawWebhook.body.conversation?.inbox_id ||
            0;
          const conversationId =
            rawWebhook.body.conversation?.id || rawWebhook.body.id || 0;
          const phoneNumber =
            rawWebhook.body.conversation?.contact_inbox?.source_id ||
            rawWebhook.body.contact_inbox?.source_id ||
            rawWebhook.body.meta?.sender?.phone_number ||
            rawWebhook.body.meta?.sender?.identifier?.replace('@s.whatsapp.net', '') ||
            rawWebhook.body.sender?.phone_number ||
            rawWebhook.body.sender?.identifier?.replace('@s.whatsapp.net', '') ||
            '';

          if (accountId && inboxId && conversationId && phoneNumber) {
            const inbox = await CacheService.getInbox(inboxId);
            if (inbox) {
              const normalizedPhone = phoneNumber.replace(/[^\d]/g, '').replace('@s.whatsapp.net', '');
              const pausedSession = await SessionModel.findByStatus(
                inbox.tenant_id,
                inbox.id,
                conversationId,
                normalizedPhone,
                'paused'
              );

              if (pausedSession) {
                console.log(`[WebhookAPI] 🔄 conversation_updated: Team/assignee removido, retomando sessão:`, {
                  conversationId,
                  phoneNumber: normalizedPhone,
                  sessionId: pausedSession.id,
                });

                const resumedCount = await SessionService.resumeSessionByConversation(
                  inbox.tenant_id,
                  inbox.id,
                  conversationId
                );
                console.log(`[WebhookAPI] ✅ Sessão retomada (${resumedCount} sessões retomadas)`);
              }
            }
          }
        }

        return res.status(200).json({
          success: true,
          event: 'conversation_updated',
        });
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

