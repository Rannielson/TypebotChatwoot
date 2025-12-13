import { Router, Request, Response } from 'express';
import { ChatwootRawWebhook } from '../types/chatwoot';
import { ChatwootNormalizer } from '../normalizers/chatwoot-normalizer';
import { InboxService } from '../services/inbox.service';
import { MessageHandler } from '../handlers/message.handler';
import { SessionService } from '../services/session.service';

const router = Router();
const messageHandler = new MessageHandler();

router.post('/chatwoot', async (req: Request, res: Response) => {
  try {
    // Log completo do payload recebido
    console.log('[Webhook] ========== PAYLOAD RECEBIDO ==========');
    console.log('[Webhook] req.body completo:', JSON.stringify(req.body, null, 2));
    console.log('[Webhook] Tipo de req.body:', typeof req.body);
    console.log('[Webhook] Chaves de req.body:', Object.keys(req.body || {}));
    console.log('[Webhook] req.body.body existe?', !!req.body?.body);
    console.log('[Webhook] req.body.event existe?', !!req.body?.event);
    
    // Normaliza o payload: Chatwoot pode enviar com wrapper { body: {...} } ou diretamente
    let rawWebhook: ChatwootRawWebhook;
    
    if (req.body.body && typeof req.body.body === 'object') {
      // Payload com wrapper (estrutura esperada)
      console.log('[Webhook] Usando payload com wrapper');
      rawWebhook = req.body as ChatwootRawWebhook;
    } else if (req.body.event) {
      // Payload direto (sem wrapper) - normaliza para estrutura esperada
      console.log('[Webhook] Usando payload direto, normalizando...');
      rawWebhook = {
        headers: req.headers as Record<string, string>,
        params: {},
        query: {},
        body: req.body,
        webhookUrl: req.body.webhookUrl,
        executionMode: req.body.executionMode,
      };
    } else {
      console.error('[Webhook] ❌ Estrutura de payload desconhecida!');
      console.error('[Webhook] req.body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Estrutura de payload inválida',
        received: req.body,
      });
    }
    
    console.log('[Webhook] Webhook normalizado:', {
      event: rawWebhook.body?.event || 'unknown',
      account_id: rawWebhook.body?.account?.id,
      inbox_id: rawWebhook.body?.inbox_id,
      hasMessages: !!rawWebhook.body?.messages,
      messagesLength: rawWebhook.body?.messages?.length || 0,
      bodyKeys: rawWebhook.body ? Object.keys(rawWebhook.body) : [],
    });
    console.log('[Webhook] ========================================');

    if (!ChatwootNormalizer.isValid(rawWebhook)) {
      console.log('[Webhook] Webhook inválido ou mensagem de saída');
      return res.status(400).json({
        success: false,
        error: 'Webhook inválido ou mensagem de saída',
      });
    }

    const event = ChatwootNormalizer.detectEvent(rawWebhook);
    console.log('[Webhook] Evento detectado:', event.type);
    console.log('[Webhook] Dados do evento:', JSON.stringify(event.data, null, 2));

    switch (event.type) {
      case 'message': {
        const normalizedMessage = event.data;
        console.log('[Webhook] Processando mensagem:', {
          account_id: normalizedMessage.account_id,
          inbox_id: normalizedMessage.inbox_id,
          content: normalizedMessage.message.content?.substring(0, 50),
        });
        
        const inbox = await InboxService.findByChatwootInboxId(
          normalizedMessage.inbox_id
        );

        if (!inbox) {
          console.log(`[Webhook] Inbox ${normalizedMessage.inbox_id} não encontrado`);
          return res.status(404).json({
            success: false,
            error: `Configuração não encontrada para inbox ${normalizedMessage.inbox_id}`,
          });
        }
        
        console.log(`[Webhook] Inbox encontrado: ${inbox.inbox_name}`);

        // Verifica se é resposta de botão ou texto livre
        const buttonMapping = await SessionService.getButtonMapping(
          normalizedMessage.account_id,
          normalizedMessage.inbox_id,
          parseInt(normalizedMessage.message.chat_id),
          normalizedMessage.message.remotejid,
          normalizedMessage.message.content || ''
        );

        if (buttonMapping) {
          // É resposta de botão
          await messageHandler.handleButtonResponse(
            normalizedMessage.account_id,
            normalizedMessage.inbox_id,
            parseInt(normalizedMessage.message.chat_id),
            normalizedMessage.message.remotejid,
            normalizedMessage.message.content || '',
            inbox
          );
        } else {
          // É mensagem de texto normal
          await messageHandler.handleMessage(normalizedMessage, inbox);
        }

        res.status(200).json({
          success: true,
          event: 'message_processed',
        });
        break;
      }

      case 'conversation_resolved': {
        console.log(`[Webhook] ✅ Entrando no case conversation_resolved`);
        const { accountId, inboxId, conversationId } = event.data;

        console.log(`[Webhook] Encerrando sessão - Account: ${accountId}, Inbox: ${inboxId}, Conversation: ${conversationId}`);

        // Busca o inbox para obter o tenant_id correto
        const inbox = await InboxService.findByChatwootInboxId(inboxId);
        if (!inbox) {
          console.log(`[Webhook] ❌ Inbox ${inboxId} não encontrado para fechar sessão`);
          return res.status(404).json({
            success: false,
            error: `Inbox ${inboxId} não encontrado`,
          });
        }

        console.log(`[Webhook] ✅ Inbox encontrado: ${inbox.inbox_name}, Tenant ID: ${inbox.tenant_id}`);
        console.log(`[Webhook] Fechando sessão no banco de dados e Redis...`);

        await SessionService.closeSession(inbox.tenant_id, inbox.id, conversationId);

        console.log(`[Webhook] ✅ Sessão encerrada com sucesso`);

        res.status(200).json({
          success: true,
          event: 'conversation_closed',
        });
        break;
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

