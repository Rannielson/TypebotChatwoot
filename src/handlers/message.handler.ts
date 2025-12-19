import { NormalizedChatwootMessage } from '../types/chatwoot';
import { Inbox } from '../models/inbox.model';
import { Tenant } from '../models/tenant.model';
import { TypebotClient } from '../clients/typebot.client';
import { TypebotStartChatRequest, TypebotResponse } from '../types/typebot';
import { WhatsAppClient } from '../clients/whatsapp.client';
import { ChatwootClient } from '../clients/chatwoot.client';
import { SessionService } from '../services/session.service';
import { LoggerService } from '../services/logger.service';
import { transformTypebotResponseToWhatsApp } from '../transformers/typebot-to-whatsapp';
import { formatWhatsAppMessageForChatwoot } from '../utils/message-formatter.util';
import { SessionModel } from '../models/session.model';
import { TenantModel } from '../models/tenant.model';
import { redis } from '../config/redis';
import { messageLogQueue } from '../config/queue.config';
import { chatwootNoteQueue } from '../config/queue.config';
import { CacheService } from '../services/cache.service';
import { TranscriptionService } from '../services/transcription.service';
import { isAudioFile } from '../utils/audio-detector.util';

export class MessageHandler {
  /**
   * Constrói as variáveis pré-preenchidas para o Typebot a partir da mensagem normalizada.
   * Essas variáveis podem ser usadas no Typebot através de {{nome}}, {{telefone}}, etc.
   * 
   * Variáveis disponíveis:
   * - nome: Nome do contato
   * - telefone: Número de telefone (apenas dígitos)
   * - conversa_id: ID da conversa no Chatwoot
   * - message_id: ID da mensagem
   * - account_id: ID da conta no Chatwoot
   * - inbox_id: ID do inbox no Chatwoot
   * - timestamp: Timestamp da mensagem (ISO 8601)
   * - speechtotext: "yes" se foi transcrição de áudio, "no" se foi texto direto
   */
  private buildTypebotVariables(
    normalizedMessage: NormalizedChatwootMessage,
    conversationId: number,
    isSpeechToText: boolean = false
  ): Record<string, string> {
    return {
      // Informações do contato
      nome: normalizedMessage.name || 'Usuário',
      telefone: normalizedMessage.message.remotejid || '',
      
      // IDs da conversa e sistema
      conversa_id: conversationId.toString(),
      message_id: normalizedMessage.message.message_id || '',
      
      // IDs do Chatwoot
      account_id: normalizedMessage.account_id.toString(),
      inbox_id: normalizedMessage.inbox_id.toString(),
      
      // Timestamp
      timestamp: normalizedMessage.message.timestamp || new Date().toISOString(),
      
      // Indica se a mensagem foi transcrita de áudio
      speechtotext: isSpeechToText ? 'yes' : 'no',
    };
  }
  async handleMessage(
    normalizedMessage: NormalizedChatwootMessage,
    inbox: Inbox
  ): Promise<void> {
    // Busca tenant do cache (rápido)
    const tenant = await CacheService.getTenant(inbox.tenant_id);
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
    const hasAttachments = !!(attachments && attachments.length > 0);

    if (!messageText && !hasAttachments) {
      console.log('Mensagem sem conteúdo nem anexos, ignorando');
      return;
    }

    // Filtro de modo teste: se estiver ativo, processa apenas mensagens do telefone especificado
    if (inbox.is_test_mode && inbox.test_phone_number) {
      // Normaliza ambos os números para comparação (apenas dígitos)
      const normalizedIncomingPhone = phoneNumber.replace(/\D/g, '');
      const normalizedTestPhone = inbox.test_phone_number.replace(/\D/g, '');
      
      if (normalizedIncomingPhone !== normalizedTestPhone) {
        console.log(
          `[MessageHandler] 🧪 Modo teste ativo: mensagem de ${phoneNumber} (${normalizedIncomingPhone}) ignorada. ` +
          `Apenas mensagens de ${inbox.test_phone_number} (${normalizedTestPhone}) são processadas.`
        );
        return; // Ignora mensagem de telefone diferente
      }
      
      console.log(
        `[MessageHandler] 🧪 Modo teste ativo: processando mensagem do telefone autorizado ${phoneNumber}`
      );
    }

    // Verifica se a sessão está pausada antes de processar
    const pausedSession = await SessionModel.findByStatus(
      inbox.tenant_id,
      inbox.id,
      conversationId,
      phoneNumber,
      'paused'
    );

    if (pausedSession) {
      // Se a sessão está pausada, tenta retomar automaticamente
      // Isso corrige casos onde team/assignee foi removido mas a sessão ainda está pausada
      console.log(
        `[MessageHandler] ⏸️ Sessão pausada detectada para ${name} (${phoneNumber}). ` +
        `Conversation: ${conversationId}, Inbox: ${inbox_id}, SessionId: ${pausedSession.id}`
      );
      console.log(
        `[MessageHandler] 🔄 Tentando retomar sessão automaticamente (team/assignee pode ter sido removido)...`
      );

      // Retoma a sessão automaticamente
      const resumedCount = await SessionService.resumeSessionByConversation(
        inbox.tenant_id,
        inbox.id,
        conversationId
      );

      if (resumedCount > 0) {
        console.log(
          `[MessageHandler] ✅ Sessão retomada automaticamente (${resumedCount} sessões). ` +
          `Processando mensagem normalmente.`
        );
        // Continua o processamento da mensagem normalmente
      } else {
        // Se não conseguiu retomar, pode ser que realmente deva estar pausada
        // Nesse caso, ignora a mensagem
        console.log(
          `[MessageHandler] ⚠️ Não foi possível retomar sessão. ` +
          `Mensagem será ignorada. Verifique se team/assignee ainda está atribuído.`
        );
        return; // Não processa mensagem quando sessão está pausada
      }
    }

    console.log(
      `[Account: ${account_id}, Inbox: ${inbox_id}] Processando mensagem de ${name} (${phoneNumber}): ${messageText || 'com anexos'}`
    );

    // Processa anexos de áudio antes de enviar ao Typebot
    let processedMessageText = messageText;
    let processedAttachments = attachments ? [...attachments] : [];
    let hasTranscribedAudio = false; // Flag para indicar se houve transcrição de áudio

    console.log(
      `[MessageHandler] 🔍 Verificando anexos: hasAttachments=${hasAttachments}, ` +
      `attachments?.length=${attachments?.length}, tenant.openai_api_key=${tenant.openai_api_key ? 'configurada' : 'NÃO configurada'}`
    );

    if (hasAttachments && attachments) {
      console.log(
        `[MessageHandler] 📎 Processando ${attachments.length} anexo(s). Detalhes:`,
        JSON.stringify(attachments.map(att => ({
          id: att.id,
          file_type: att.file_type,
          data_url: att.data_url,
          file_size: att.file_size,
        })), null, 2)
      );

      const audioAttachments = attachments.filter(att => {
        const isAudio = isAudioFile(att.file_type, att.data_url);
        console.log(
          `[MessageHandler] 🔍 Verificando anexo ${att.id}: file_type="${att.file_type}", ` +
          `url="${att.data_url}", é áudio? ${isAudio}`
        );
        return isAudio;
      });

      if (audioAttachments.length > 0) {
        console.log(
          `[MessageHandler] 🎵 Detectado(s) ${audioAttachments.length} arquivo(s) de áudio. Iniciando transcrição...`
        );

        // Verifica se tenant tem API key configurada
        if (!tenant.openai_api_key || tenant.openai_api_key.trim() === '') {
          console.log(
            `[MessageHandler] ⚠️ Tenant ${tenant.id} não possui OpenAI API key configurada. ` +
            `Áudios serão enviados sem transcrição.`
          );
        } else {
          // Processa cada áudio sequencialmente
          for (const audioAttachment of audioAttachments) {
            try {
              console.log(
                `[MessageHandler] 🎤 Transcrevendo áudio: ${audioAttachment.file_type} ` +
                `(${audioAttachment.file_size ? (audioAttachment.file_size / 1024).toFixed(2) + 'KB' : 'tamanho desconhecido'})`
              );

              const transcribedText = await TranscriptionService.transcribeAudioFromUrl(
                audioAttachment.data_url,
                tenant.openai_api_key!
              );

              if (transcribedText && transcribedText.trim()) {
                // Marca que houve transcrição de áudio
                hasTranscribedAudio = true;
                
                // Adiciona texto transcrito à mensagem (sem prefixo, como se fosse texto normal)
                if (processedMessageText) {
                  // Se já houver texto, adiciona o transcrito na mesma linha ou em nova linha
                  processedMessageText = processedMessageText.trim() 
                    ? `${processedMessageText}\n${transcribedText}`
                    : transcribedText;
                } else {
                  // Se não houver texto, usa apenas o texto transcrito
                  processedMessageText = transcribedText;
                }

                console.log(
                  `[MessageHandler] ✅ Transcrição concluída. Texto adicionado à mensagem como texto normal.`
                );
                console.log(
                  `[MessageHandler] 📝 Texto final que será enviado: "${processedMessageText.substring(0, 200)}${processedMessageText.length > 200 ? '...' : ''}"`
                );

                // Remove áudio da lista de anexos
                processedAttachments = processedAttachments.filter(
                  att => att.id !== audioAttachment.id
                );
              } else {
                console.warn(
                  `[MessageHandler] ⚠️ Transcrição retornou texto vazio. Áudio será mantido nos anexos.`
                );
              }
            } catch (error: any) {
              console.error(
                `[MessageHandler] ❌ Erro ao transcrever áudio (ID: ${audioAttachment.id}):`,
                error.message
              );
              console.error(
                `[MessageHandler] Áudio será enviado sem transcrição para o Typebot.`
              );
              // Mantém o áudio nos anexos em caso de erro
            }
          }
        }
      }
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

      const attachedFileUrls = processedAttachments?.map((att) => att.data_url) || [];

      // Log detalhado das informações enviadas para o Typebot
      this.logTypebotRequest('continueChat', session.sessionId, {
        message: processedMessageText || '',
        attachedFileUrls: attachedFileUrls.length > 0 ? attachedFileUrls : undefined,
      }, {
        normalizedMessage,
        conversationId,
        phoneNumber,
        messageText: processedMessageText,
        hasAttachments: processedAttachments.length > 0,
        attachmentsCount: processedAttachments.length,
      });

      try {
        typebotResponse = await typebotClient.continueChat(
          session.sessionId,
          processedMessageText || '',
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

      // Inicia o chat com mensagem e variáveis pré-preenchidas
      // Formato simplificado: sempre envia message (string) e prefilledVariables
      const attachedFileUrls = processedAttachments?.map((att) => att.data_url) || [];
      
      // Constrói variáveis pré-preenchidas do normalizador
      const prefilledVariables = this.buildTypebotVariables(
        normalizedMessage,
        conversationId,
        hasTranscribedAudio
      );
      
      // Monta o request no formato simplificado
      // Se houver anexos, usa formato de objeto para incluir attachedFileUrls
      // Caso contrário, usa formato simples com message como string
      const startRequest: TypebotStartChatRequest = attachedFileUrls.length > 0
        ? {
            message: {
              type: 'text',
              text: processedMessageText || '',
              attachedFileUrls: attachedFileUrls,
            },
            prefilledVariables,
          }
        : {
            message: processedMessageText || '', // String vazia se não houver texto
            prefilledVariables,
          };

      // Log detalhado das informações enviadas para o Typebot
      this.logTypebotRequest('startChat', inbox.typebot_public_id, startRequest, {
        normalizedMessage,
        conversationId,
        phoneNumber,
        messageText: processedMessageText,
        hasAttachments: processedAttachments.length > 0,
        attachmentsCount: processedAttachments.length,
      });

      typebotResponse = await typebotClient.startChat(
        inbox.typebot_public_id,
        startRequest
      );

      console.log(`[MessageHandler] Resposta do Typebot startChat:`, {
        sessionId: typebotResponse.sessionId,
        resultId: typebotResponse.resultId,
        hasMessages: !!typebotResponse.messages,
        messagesLength: typebotResponse.messages?.length || 0,
      });

      if (!typebotResponse.sessionId) {
        console.error(`[MessageHandler] ❌ Typebot não retornou sessionId! Resposta completa:`, JSON.stringify(typebotResponse, null, 2));
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
      console.log(`[MessageHandler] Nova sessão iniciada. Mostrando resposta inicial do Typebot primeiro.`);
      console.log(`[MessageHandler] Mensagem do usuário "${messageText}" será processada na próxima interação.`);
    }

    // Atualiza a sessão apenas se tiver sessionId válido
    if (typebotResponse && typebotResponse.sessionId) {
      console.log(`[MessageHandler] Atualizando sessão final com sessionId: ${typebotResponse.sessionId}`);
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
      console.error(`[MessageHandler] ❌ Não é possível atualizar sessão final:`, {
        hasTypebotResponse: !!typebotResponse,
        sessionId: typebotResponse?.sessionId,
      });
    }

    // Logs assíncronos (não bloqueiam)
    if (dbSessionId) {
      messageLogQueue.add('log-incoming', {
        type: 'log-incoming',
        data: {
          sessionId: dbSessionId,
          content: processedMessageText,
          contentType: message.content_type,
          chatwootMessageId: message.message_id,
          attachments: processedAttachments,
        },
      });
    }

    // Transforma resposta do Typebot em mensagens WhatsApp
    const whatsappMessages = transformTypebotResponseToWhatsApp(
      typebotResponse,
      phoneNumber
    );

    // Processa clientSideActions para extrair wait (pega apenas o primeiro)
    const waitDelayMs = this.extractWaitDelay(typebotResponse);
    
    if (waitDelayMs > 0) {
      console.log(
        `[MessageHandler] ⏱️ Wait detectado: ${waitDelayMs}ms (${waitDelayMs / 1000}s). ` +
        `Aplicando entre cada uma das ${whatsappMessages.length} mensagem(ns)...`
      );
    } else {
      console.log(
        `[MessageHandler] ⏱️ Nenhum wait detectado. Usando delay padrão de 500ms entre mensagens.`
      );
    }

    // Envia mensagens para WhatsApp
    for (let i = 0; i < whatsappMessages.length; i++) {
      const whatsappMessage = whatsappMessages[i];
      
      // Aplica delay ANTES de enviar a mensagem (exceto a primeira)
      if (i > 0) {
        // Se houver wait configurado, usa ele. Caso contrário, usa delay padrão de 500ms
        const delayToApply = waitDelayMs > 0 ? waitDelayMs : 500;
        
        console.log(
          `[MessageHandler] ⏳ Aguardando ${delayToApply}ms (${delayToApply / 1000}s) antes de enviar mensagem ${i + 1}/${whatsappMessages.length}`
        );
        await this.delay(delayToApply);
      }

      const response = await this.sendWhatsAppMessage(
        whatsappMessage,
        whatsappClient
      );

      // Notas do Chatwoot assíncronas (não bloqueiam)
      chatwootNoteQueue.add('create-note', {
        tenant,
        inbox,
        conversationId,
        whatsappMessage,
      });

      // Log assíncrono
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

        messageLogQueue.add('log-outgoing', {
          type: 'log-outgoing',
          data: {
            sessionId: dbSessionId,
            content,
            contentType: whatsappMessage.type,
            whatsappMessageId: response.messages[0]?.id,
            typebotResponse,
          },
        });
      }
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
      
      // Cria mensagem no Chatwoot (comum para texto, privada para imagens/listas/botões)
      await this.createChatwootMessage(
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

  private async createChatwootMessage(
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
        'Configuração do Chatwoot incompleta (URL ou token faltando), pulando criação de mensagem'
      );
      return;
    }

    if (!accountId) {
      console.log(
        `Account ID do Chatwoot não configurado no tenant ${tenant.id}, pulando criação de mensagem`
      );
      return;
    }

    try {
      const chatwootClient = new ChatwootClient(chatwootUrl, chatwootApiToken);
      const noteContent = formatWhatsAppMessageForChatwoot(whatsappMessage);

      // Lógica: apenas texto usa mensagem comum (private: false)
      // Imagens, listas e botões usam nota privada (private: true)
      const isPrivate = whatsappMessage.type !== 'text';

      await chatwootClient.createMessage(
        accountId,
        conversationId,
        noteContent,
        isPrivate
      );
    } catch (error: any) {
      const messageType = whatsappMessage.type === 'text' ? 'mensagem comum' : 'nota privada';
      console.error(`Erro ao criar ${messageType} no Chatwoot:`, error);
      // Não lança erro para não interromper o fluxo principal
    }
  }

  /**
   * Log detalhado e estruturado de todas as informações enviadas para o Typebot
   */
  private logTypebotRequest(
    method: 'startChat' | 'continueChat',
    identifier: string,
    request: any,
    context: {
      normalizedMessage: NormalizedChatwootMessage;
      conversationId: number;
      phoneNumber: string;
      messageText: string;
      hasAttachments: boolean;
      attachmentsCount: number;
    }
  ): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📤 ENVIANDO DADOS PARA O TYPEBOT - ${method.toUpperCase()}`);
    console.log('='.repeat(80));
    
    console.log(`\n🔹 Método: ${method}`);
    console.log(`🔹 Identificador: ${identifier}`);
    console.log(`🔹 URL Base: ${context.normalizedMessage.cw?.url || 'N/A'}`);
    
    console.log(`\n📋 CONTEXTO DA MENSAGEM:`);
    console.log(`   • Nome do Contato: ${context.normalizedMessage.name || 'N/A'}`);
    console.log(`   • Telefone: ${context.phoneNumber || 'N/A'}`);
    console.log(`   • ID da Conversa: ${context.conversationId}`);
    console.log(`   • ID da Mensagem: ${context.normalizedMessage.message.message_id || 'N/A'}`);
    console.log(`   • Texto da Mensagem: ${context.messageText || '(vazio)'}`);
    console.log(`   • Tem Anexos: ${context.hasAttachments ? 'Sim' : 'Não'}`);
    console.log(`   • Quantidade de Anexos: ${context.attachmentsCount}`);
    
    if (context.hasAttachments && context.normalizedMessage.attachments) {
      console.log(`\n📎 ANEXOS:`);
      context.normalizedMessage.attachments.forEach((att, index) => {
        console.log(`   ${index + 1}. ID: ${att.id}, Tipo: ${att.file_type}, Tamanho: ${att.file_size || 'N/A'} bytes`);
        console.log(`      URL: ${att.data_url}`);
      });
    }
    
    console.log(`\n📦 PAYLOAD ENVIADO PARA O TYPEBOT:`);
    console.log(JSON.stringify(request, null, 2));
    
    if (request.prefilledVariables) {
      console.log(`\n🔧 VARIÁVEIS PRÉ-PREENCHIDAS (disponíveis no Typebot):`);
      Object.entries(request.prefilledVariables).forEach(([key, value]) => {
        console.log(`   • {{${key}}}: ${value}`);
      });
    }
    
    if (request.message) {
      console.log(`\n💬 MENSAGEM ENVIADA:`);
      // message pode ser string ou objeto
      if (typeof request.message === 'string') {
        console.log(`   • Formato: String simples`);
        console.log(`   • Texto: ${request.message || '(vazio)'}`);
      } else {
        console.log(`   • Formato: Objeto`);
        console.log(`   • Tipo: ${request.message.type || 'N/A'}`);
        console.log(`   • Texto: ${request.message.text || '(vazio)'}`);
        if (request.message.attachedFileUrls && request.message.attachedFileUrls.length > 0) {
          console.log(`   • URLs de Anexos: ${request.message.attachedFileUrls.length}`);
          request.message.attachedFileUrls.forEach((url: string, index: number) => {
            console.log(`     ${index + 1}. ${url}`);
          });
        }
      }
    }
    
    console.log(`\n📊 DADOS DO CHATWOOT:`);
    console.log(`   • Account ID: ${context.normalizedMessage.account_id}`);
    console.log(`   • Inbox ID: ${context.normalizedMessage.inbox_id}`);
    console.log(`   • Chat ID: ${context.normalizedMessage.message.chat_id}`);
    console.log(`   • Content Type: ${context.normalizedMessage.message.content_type || 'N/A'}`);
    console.log(`   • Timestamp: ${context.normalizedMessage.message.timestamp || 'N/A'}`);
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Extrai delay do primeiro wait action do Typebot response
   * Retorna delay em milissegundos (0 se não houver wait)
   * 
   * Regras:
   * - Pega apenas o primeiro wait encontrado
   * - Se tiver `secondsToWaitFor`, converte segundos para milissegundos
   * - Se tiver `timeout`, usa diretamente (já está em milissegundos)
   * - Se não tiver nenhum, retorna 0
   */
  private extractWaitDelay(typebotResponse: TypebotResponse): number {
    if (!typebotResponse.clientSideActions || typebotResponse.clientSideActions.length === 0) {
      return 0;
    }

    console.log(
      `[MessageHandler] 🔍 Analisando clientSideActions:`,
      JSON.stringify(typebotResponse.clientSideActions, null, 2)
    );

    // Procura o primeiro wait action
    for (const action of typebotResponse.clientSideActions) {
      if (action.type === 'wait' && action.wait) {
        let delayMs = 0;
        
        // Prioridade: secondsToWaitFor > timeout
        if (action.wait.secondsToWaitFor !== undefined) {
          // Converte segundos para milissegundos
          delayMs = action.wait.secondsToWaitFor * 1000;
          console.log(
            `[MessageHandler] ⏱️ Wait encontrado: ${action.wait.secondsToWaitFor}s (${delayMs}ms)`
          );
        } else if (action.wait.timeout !== undefined) {
          // Já está em milissegundos
          delayMs = action.wait.timeout;
          console.log(
            `[MessageHandler] ⏱️ Wait encontrado: ${delayMs}ms (timeout)`
          );
        } else if (action.wait.event) {
          // Se tem event mas não tem tempo, usa delay padrão de 1s
          delayMs = 1000;
          console.log(
            `[MessageHandler] ⏱️ Wait encontrado (event sem tempo): ${delayMs}ms (event: ${action.wait.event})`
          );
        }
        
        // Retorna o primeiro wait encontrado (ignora os demais)
        if (delayMs > 0) {
          return delayMs;
        }
      }
    }

    return 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

