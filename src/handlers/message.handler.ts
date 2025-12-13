import { NormalizedChatwootMessage } from '../types/chatwoot';
import { Inbox } from '../models/inbox.model';
import { Tenant } from '../models/tenant.model';
import { TypebotClient } from '../clients/typebot.client';
import { WhatsAppClient } from '../clients/whatsapp.client';
import { ChatwootClient } from '../clients/chatwoot.client';
import { SessionService } from '../services/session.service';
import { LoggerService } from '../services/logger.service';
import { transformTypebotResponseToWhatsApp } from '../transformers/typebot-to-whatsapp';
import { formatWhatsAppMessageForChatwoot } from '../utils/message-formatter.util';
import { SessionModel } from '../models/session.model';
import { TenantModel } from '../models/tenant.model';
import { redis } from '../config/redis';

export class MessageHandler {
  async handleMessage(
    normalizedMessage: NormalizedChatwootMessage,
    inbox: Inbox
  ): Promise<void> {
    const tenant = await TenantModel.findById(inbox.tenant_id);
    if (!tenant) {
      throw new Error(`Tenant ${inbox.tenant_id} não encontrado`);
    }
    const {
      message,
      attachments,
      account_id,
      inbox_id,
      name,
    } = normalizedMessage;

    const conversationId = parseInt(message.chat_id);
    const phoneNumber = message.remotejid;
    const messageText = message.content?.trim() || '';
    const hasAttachments = attachments && attachments.length > 0;

    if (!messageText && !hasAttachments) {
      console.log('Mensagem sem conteúdo nem anexos, ignorando');
      return;
    }

    console.log(
      `[Account: ${account_id}, Inbox: ${inbox_id}] Processando mensagem de ${name} (${phoneNumber}): ${messageText || 'com anexos'}`
    );

    const typebotClient = new TypebotClient(
      inbox.typebot_base_url,
      inbox.typebot_api_key || undefined
    );

    const whatsappClient = new WhatsAppClient(
      inbox.whatsapp_phone_number_id,
      inbox.whatsapp_access_token,
      inbox.whatsapp_api_version
    );

    let session = await SessionService.getSession(
      inbox.tenant_id,
      inbox.id, // Usa o ID interno do inbox, não o inbox_id do Chatwoot
      conversationId,
      phoneNumber
    );

    // Se não encontrou sessão com tenant_id correto, tenta buscar por typebot_session_id
    // (para migrar sessões antigas criadas com tenant_id incorreto)
    let dbSessionId: number | null = null;
    if (!session) {
      // Busca sessão ativa por inbox.id (ID interno) e conversation_id
      const dbSession = await SessionModel.findActiveByInboxAndConversation(
        inbox.id, // Usa o ID interno do inbox
        conversationId,
        phoneNumber
      );
      
      if (dbSession) {
        console.log(`Migrando sessão antiga: tenant_id ${dbSession.tenant_id} -> ${inbox.tenant_id}`);
        // Migra a sessão para o tenant_id correto
        await SessionModel.update(dbSession.id, {
          tenant_id: inbox.tenant_id,
        });
        
        // Recarrega a sessão com tenant_id correto
        session = await SessionService.getSession(
          inbox.tenant_id,
          inbox.id, // Usa o ID interno do inbox
          conversationId,
          phoneNumber
        );
      }
    }

    let typebotResponse;

    if (session) {
      console.log(`Continuando sessão Typebot: ${session.sessionId}`);

      const attachedFileUrls = attachments?.map((att) => att.data_url) || [];

      try {
        typebotResponse = await typebotClient.continueChat(
          session.sessionId,
          messageText || '',
          attachedFileUrls.length > 0 ? attachedFileUrls : undefined
        );

        const dbSession = await SessionModel.findByTypebotSessionId(session.sessionId);
        dbSessionId = dbSession?.id || null;
      } catch (error: any) {
        // Se a sessão do Typebot expirou ou não existe mais, inicia uma nova
        if (error.message?.includes('Session not found') || error.message?.includes('not found')) {
          console.log(`Sessão Typebot expirada ou não encontrada, iniciando nova sessão`);
          
          // Fecha a sessão antiga no nosso banco
          const oldDbSession = await SessionModel.findByTypebotSessionId(session.sessionId);
          if (oldDbSession) {
            await SessionModel.update(oldDbSession.id, { status: 'expired' });
          }
          
          // Remove do Redis
          const sessionKey = `session:${inbox.tenant_id}:${inbox.id}:${conversationId}:${phoneNumber}`;
          await redis.del(sessionKey);
          
          // Força criação de nova sessão
          session = null;
        } else {
          throw error;
        }
      }
    }
    
    if (!session || !typebotResponse) {
      console.log(
        `Iniciando nova sessão Typebot (${inbox.typebot_public_id}) - iniciando do início do fluxo`
      );

      // Inicia o chat sem mensagem para que o Typebot inicie do início do fluxo
      // O Typebot vai mostrar a primeira mensagem e botões do fluxo
      const attachedFileUrls = attachments?.map((att) => att.data_url) || [];
      
      // Se houver apenas anexos (sem texto), inclui os anexos no startChat
      // Caso contrário, inicia vazio para pegar o início do fluxo
      const startRequest: any = attachedFileUrls.length > 0 && !messageText
        ? {
            message: {
              type: 'text',
              text: '',
              attachedFileUrls: attachedFileUrls,
            },
          }
        : {}; // Objeto vazio para iniciar do início do fluxo

      console.log(`Iniciando chat com request:`, JSON.stringify(startRequest));

      typebotResponse = await typebotClient.startChat(
        inbox.typebot_public_id,
        startRequest
      );

      console.log(`[Webhook] Resposta do Typebot startChat:`, {
        sessionId: typebotResponse.sessionId,
        resultId: typebotResponse.resultId,
        hasMessages: !!typebotResponse.messages,
        messagesLength: typebotResponse.messages?.length || 0,
      });

      if (!typebotResponse.sessionId) {
        console.error(`[Webhook] ❌ Typebot não retornou sessionId! Resposta completa:`, JSON.stringify(typebotResponse, null, 2));
        throw new Error('Typebot não retornou sessionId na resposta');
      }

      session = await SessionService.createOrUpdateSession(
        inbox.tenant_id,
        inbox.id, // Usa o ID interno do inbox
        conversationId,
        phoneNumber,
        inbox.typebot_public_id,
        typebotResponse,
        name // Passa o nome do contato
      );

      const dbSession = await SessionModel.findByTypebotSessionId(
        typebotResponse.sessionId
      );
      dbSessionId = dbSession?.id || null;

      // Quando inicia uma nova sessão, mostra primeiro a resposta inicial do Typebot
      // A mensagem do usuário será processada na PRÓXIMA interação (quando ele enviar outra mensagem)
      // Isso evita o erro "Invalid message" quando o Typebot está esperando um clique de botão
      console.log(`[Webhook] Nova sessão iniciada. Mostrando resposta inicial do Typebot primeiro.`);
      console.log(`[Webhook] Mensagem do usuário "${messageText}" será processada na próxima interação.`);
    }

    // Atualiza a sessão apenas se tiver sessionId válido
    if (typebotResponse && typebotResponse.sessionId) {
      console.log(`[Webhook] Atualizando sessão final com sessionId: ${typebotResponse.sessionId}`);
      await SessionService.createOrUpdateSession(
        inbox.tenant_id,
        inbox.id, // Usa o ID interno do inbox
        conversationId,
        phoneNumber,
        inbox.typebot_public_id,
        typebotResponse,
        name // Passa o nome do contato
      );
    } else {
      console.error(`[Webhook] ❌ Não é possível atualizar sessão final:`, {
        hasTypebotResponse: !!typebotResponse,
        sessionId: typebotResponse?.sessionId,
      });
    }

    // Loga mensagem de entrada
    if (dbSessionId) {
      await LoggerService.logIncomingMessage(
        dbSessionId,
        messageText,
        message.content_type,
        message.message_id,
        attachments
      );
    }

    // Transforma resposta do Typebot em mensagens WhatsApp
    const whatsappMessages = transformTypebotResponseToWhatsApp(
      typebotResponse,
      phoneNumber
    );

    // Envia mensagens para WhatsApp
    for (const whatsappMessage of whatsappMessages) {
      const response = await this.sendWhatsAppMessage(
        whatsappMessage,
        whatsappClient
      );

      // Cria nota privada no Chatwoot
      await this.createChatwootPrivateNote(
        tenant,
        inbox,
        conversationId,
        whatsappMessage
      );

      // Loga mensagem de saída
      if (dbSessionId) {
        let content: string | null = null;
        
        if (whatsappMessage.type === 'text') {
          content = whatsappMessage.text.body;
        } else if (whatsappMessage.type === 'image') {
          content = `[Imagem: ${whatsappMessage.image.link}]`;
        } else if (whatsappMessage.type === 'interactive') {
          // Verifica se é mensagem interativa com CTA de imagem (tipo cta_url)
          if (whatsappMessage.interactive.type === 'cta_url') {
            content = `[Imagem Interativa com CTA: ${whatsappMessage.interactive.header.image.link} -> ${whatsappMessage.interactive.action.parameters.url} (${whatsappMessage.interactive.action.parameters.display_text})]`;
          } else if (whatsappMessage.interactive.type === 'list') {
            const sectionsCount = whatsappMessage.interactive.action.sections.length;
            const totalRows = whatsappMessage.interactive.action.sections.reduce(
              (sum: number, section: any) => sum + section.rows.length,
              0
            );
            content = `[Lista Interativa: ${sectionsCount} seções, ${totalRows} opções] ${whatsappMessage.interactive.body.text}`;
          } else {
            content = whatsappMessage.interactive.body.text;
          }
        }

        await LoggerService.logOutgoingMessage(
          dbSessionId,
          content,
          whatsappMessage.type,
          response.messages[0]?.id,
          typebotResponse
        );
      }

      // Delay entre mensagens
      await this.delay(500);
    }
  }

  async handleButtonResponse(
    accountId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string,
    buttonTitle: string,
    inbox: Inbox
  ): Promise<void> {
    const outgoingEdgeId = await SessionService.getButtonMapping(
      inbox.tenant_id,
      inboxId,
      conversationId,
      phoneNumber,
      buttonTitle
    );

    if (!outgoingEdgeId) {
      throw new Error(
        `Mapeamento de botão não encontrado para: ${buttonTitle}`
      );
    }

    const session = await SessionService.getSession(
      inbox.tenant_id,
      inboxId,
      conversationId,
      phoneNumber
    );

    if (!session) {
      throw new Error('Sessão não encontrada para processar resposta de botão');
    }

    const typebotClient = new TypebotClient(
      inbox.typebot_base_url,
      inbox.typebot_api_key || undefined
    );

    const whatsappClient = new WhatsAppClient(
      inbox.whatsapp_phone_number_id,
      inbox.whatsapp_access_token,
      inbox.whatsapp_api_version
    );

    const typebotResponse = await typebotClient.continueChat(
      session.sessionId,
      outgoingEdgeId
    );

    // Busca o nome do contato da sessão existente ou usa um padrão
    const existingSession = await SessionModel.findActive(
      inbox.tenant_id,
      inbox.id,
      conversationId,
      phoneNumber
    );
    const contactName = existingSession?.contact_name || 'Usuário';

    await SessionService.createOrUpdateSession(
      inbox.tenant_id,
      inbox.id, // Usa o ID interno do inbox
      conversationId,
      phoneNumber,
      session.typebotPublicId,
      typebotResponse,
      contactName
    );

    const tenant = await TenantModel.findById(inbox.tenant_id);
    if (!tenant) {
      throw new Error(`Tenant ${inbox.tenant_id} não encontrado`);
    }

    const whatsappMessages = transformTypebotResponseToWhatsApp(
      typebotResponse,
      phoneNumber
    );

    for (const whatsappMessage of whatsappMessages) {
      await this.sendWhatsAppMessage(whatsappMessage, whatsappClient);
      
      // Cria nota privada no Chatwoot
      await this.createChatwootPrivateNote(
        tenant,
        inbox,
        conversationId,
        whatsappMessage
      );
      
      await this.delay(500);
    }
  }

  private async sendWhatsAppMessage(
    message: any,
    whatsappClient: WhatsAppClient
  ): Promise<any> {
    try {
      if (message.type === 'text') {
        return await whatsappClient.sendTextMessage(
          message.to,
          message.text.body
        );
      } else if (message.type === 'image') {
        return await whatsappClient.sendImageMessage(
          message.to,
          message.image.link,
          message.image.caption
        );
      } else if (message.type === 'interactive') {
        // Verifica se é mensagem interativa com CTA URL (tipo cta_url)
        if (message.interactive.type === 'cta_url') {
          return await whatsappClient.sendInteractiveCTAImage(
            message.to,
            message.interactive.header.image.link,
            message.interactive.action.parameters.url,
            message.interactive.body.text,
            message.interactive.action.parameters.display_text,
            message.interactive.footer?.text
          );
        }
        
        // Mensagem interativa com lista (list)
        if (message.interactive.type === 'list') {
          const sections = message.interactive.action.sections.map((section: any) => ({
            title: section.title,
            rows: section.rows.map((row: any) => ({
              id: row.id,
              title: row.title,
              description: row.description,
            })),
          }));
          return await whatsappClient.sendInteractiveList(
            message.to,
            message.interactive.body.text,
            message.interactive.action.button,
            sections,
            message.interactive.header?.type === 'text' 
              ? message.interactive.header.text 
              : undefined,
            message.interactive.footer?.text
          );
        }
        
        // Mensagem interativa com botões de resposta (reply)
        if (message.interactive.type === 'button') {
          const buttons = message.interactive.action.buttons.map(
            (btn: any) => ({
              id: btn.reply.id,
              title: btn.reply.title,
            })
          );
          return await whatsappClient.sendInteractiveButtons(
            message.to,
            message.interactive.body.text,
            buttons,
            message.interactive.header?.type === 'text' 
              ? message.interactive.header.text 
              : undefined,
            message.interactive.footer?.text
          );
        }
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }

  private async createChatwootPrivateNote(
    tenant: Tenant,
    inbox: Inbox,
    conversationId: number,
    whatsappMessage: any
  ): Promise<void> {
    // Verifica se tem configuração do Chatwoot
    const chatwootUrl = tenant.chatwoot_url || process.env.CHATWOOT_DEFAULT_URL;
    const chatwootApiToken =
      inbox.chatwoot_api_token ||
      tenant.chatwoot_token ||
      process.env.CHATWOOT_DEFAULT_TOKEN;
    
    // Account ID deve estar configurado no tenant (obrigatório por tenant)
    const accountId = tenant.chatwoot_account_id;

    if (!chatwootUrl || !chatwootApiToken) {
      console.log(
        'Configuração do Chatwoot incompleta (URL ou token faltando), pulando criação de nota privada'
      );
      return;
    }

    if (!accountId) {
      console.log(
        `Account ID do Chatwoot não configurado no tenant ${tenant.id}, pulando criação de nota privada`
      );
      return;
    }

    try {
      const chatwootClient = new ChatwootClient(chatwootUrl, chatwootApiToken);
      const noteContent = formatWhatsAppMessageForChatwoot(whatsappMessage);

      await chatwootClient.createPrivateNote(
        accountId,
        conversationId,
        noteContent
      );
    } catch (error: any) {
      console.error('Erro ao criar nota privada no Chatwoot:', error);
      // Não lança erro para não interromper o fluxo principal
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

