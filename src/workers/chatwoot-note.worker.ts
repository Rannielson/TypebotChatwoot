import { Worker } from 'bullmq';
import { queueConnection } from '../config/queue.config';
import { ChatwootClient } from '../clients/chatwoot.client';
import { formatWhatsAppMessageForChatwoot } from '../utils/message-formatter.util';

export const chatwootNoteWorker = new Worker(
  'chatwoot-notes',
  async (job) => {
    const { tenant, inbox, conversationId, whatsappMessage } = job.data;
    
    const chatwootUrl = tenant.chatwoot_url || process.env.CHATWOOT_DEFAULT_URL;
    const chatwootApiToken = inbox.chatwoot_api_token || 
                            tenant.chatwoot_token || 
                            process.env.CHATWOOT_DEFAULT_TOKEN;
    const accountId = tenant.chatwoot_account_id;

    if (!chatwootUrl || !chatwootApiToken || !accountId) {
      return; // Silenciosamente ignora se não configurado
    }

    try {
      const chatwootClient = new ChatwootClient(chatwootUrl, chatwootApiToken);
      const noteContent = formatWhatsAppMessageForChatwoot(whatsappMessage);
      
      // IMPORTANTE: 
      // - Mensagens de TEXTO são criadas como mensagens COMUNS (private: false) no Chatwoot
      //   porque são enviadas APENAS pelo Chatwoot (não pela Meta API)
      // - Mensagens de IMAGEM/INTERATIVAS são criadas como NOTAS PRIVADAS (private: true)
      //   porque são enviadas pela Meta API e o Chatwoot apenas registra para histórico
      // Notas privadas não disparam eventos de message_created no Chatwoot
      const isPrivate = whatsappMessage.type !== 'text';
      
      const messageTypeLabel = isPrivate ? 'nota privada' : 'mensagem comum';
      console.log(`[ChatwootNoteWorker] 📝 Criando ${messageTypeLabel} no Chatwoot:`, {
        conversationId,
        messageType: whatsappMessage.type,
        contentPreview: noteContent.substring(0, 50),
        isPrivate,
      });
      
      await chatwootClient.createMessage(
        accountId,
        conversationId,
        noteContent,
        isPrivate
      );
    } catch (error: any) {
      console.error('[ChatwootNoteWorker] Erro ao criar mensagem no Chatwoot:', error.message);
      // Não relança erro para não bloquear a fila
    }
  },
  {
    connection: queueConnection,
    concurrency: parseInt(process.env.CHATWOOT_NOTE_WORKER_CONCURRENCY || '20', 10),
  }
);

chatwootNoteWorker.on('failed', (job, err) => {
  console.error(`[ChatwootNoteWorker] Job ${job?.id} falhou:`, err.message);
});
