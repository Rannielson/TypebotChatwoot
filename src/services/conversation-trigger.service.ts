import { SessionModel } from '../models/session.model';
import { InboxModel } from '../models/inbox.model';
import { TenantModel } from '../models/tenant.model';
import { TriggerModel } from '../models/trigger.model';
import { TriggerExecutionModel } from '../models/trigger-execution.model';
import { ChatwootClient } from '../clients/chatwoot.client';
import { TypebotClient } from '../clients/typebot.client';
import { WhatsAppClient } from '../clients/whatsapp.client';
import { transformTypebotResponseToWhatsApp } from '../transformers/typebot-to-whatsapp';
import { messageLogQueue, chatwootNoteQueue } from '../config/queue.config';
import { redis } from '../config/redis';
import logger from '../utils/logger.util';
import { TypebotResponse } from '../types/typebot';

export class ConversationTriggerService {
  /**
   * Verifica conversas de um inbox e aciona comandos do Typebot quando necessário
   * OTIMIZADO: Agrupa triggers por frequência para fazer uma única chamada GET por sessão
   */
  static async checkAndTriggerConversations(
    inboxId: number,
    triggerId: number
  ): Promise<void> {
    try {
      // Busca trigger e inbox
      const trigger = await TriggerModel.findById(triggerId);
      if (!trigger || !trigger.is_active) {
        logger.info(`Trigger ${triggerId} não encontrado ou inativo, pulando verificação`);
        return;
      }

      const inbox = await InboxModel.findById(inboxId);
      if (!inbox || !inbox.is_active) {
        logger.info(`Inbox ${inboxId} não encontrado ou inativo, pulando verificação`);
        return;
      }

      // Busca tenant
      const tenant = await TenantModel.findById(inbox.tenant_id);
      if (!tenant) {
        logger.error(`Tenant ${inbox.tenant_id} não encontrado para inbox ${inboxId}`);
        return;
      }

      // Busca sessões ativas do inbox
      const activeSessions = await SessionModel.findAllWithFilters({
        status: 'active',
        inboxId: inbox.id,
      });

      logger.info(
        `[ConversationTriggerService] Verificando ${activeSessions.length} sessões ativas ` +
        `para inbox ${inboxId} com trigger ${triggerId} (${trigger.name})`
      );

      // Processa cada sessão
      for (const session of activeSessions) {
        try {
          await this.processSession(session, inbox, tenant, trigger);
        } catch (error: any) {
          logger.error(
            `[ConversationTriggerService] Erro ao processar sessão ${session.id}: ${error.message}`
          );
          // Continua com próxima sessão mesmo se houver erro
        }
      }
    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao verificar conversas: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * OTIMIZADO: Verifica múltiplos triggers com a mesma frequência
   * Faz UMA chamada GET por sessão e verifica todos os triggers dessa frequência
   */
  static async checkAndTriggerConversationsByFrequency(
    frequencyMinutes: number
  ): Promise<void> {
    try {
      // Busca todos os triggers ativos com essa frequência
      const activeTriggers = await TriggerModel.findActive();
      const triggersWithFrequency = activeTriggers.filter(
        t => t.check_frequency_minutes === frequencyMinutes
      );

      if (triggersWithFrequency.length === 0) {
        logger.debug(
          `[ConversationTriggerService] Nenhum trigger ativo com frequência ${frequencyMinutes} minutos`
        );
        return;
      }

      logger.info(
        `[ConversationTriggerService] 🚀 OTIMIZAÇÃO: Verificando ${triggersWithFrequency.length} ` +
        `trigger(s) com frequência ${frequencyMinutes} minutos (UMA chamada GET por sessão)`
      );

      // Agrupa triggers por inbox
      const inboxTriggersMap = new Map<number, any[]>();
      
      for (const trigger of triggersWithFrequency) {
        const inboxIds = await TriggerModel.getInboxIdsForTrigger(trigger.id);
        for (const inboxId of inboxIds) {
          if (!inboxTriggersMap.has(inboxId)) {
            inboxTriggersMap.set(inboxId, []);
          }
          inboxTriggersMap.get(inboxId)!.push(trigger);
        }
      }

      // Processa cada inbox
      for (const [inboxId, triggers] of inboxTriggersMap.entries()) {
        try {
          const inbox = await InboxModel.findById(inboxId);
          if (!inbox || !inbox.is_active) {
            continue;
          }

          const tenant = await TenantModel.findById(inbox.tenant_id);
          if (!tenant) {
            logger.error(`Tenant ${inbox.tenant_id} não encontrado para inbox ${inboxId}`);
            continue;
          }

          // Busca sessões ativas do inbox
          const activeSessions = await SessionModel.findAllWithFilters({
            status: 'active',
            inboxId: inbox.id,
          });

          logger.info(
            `[ConversationTriggerService] Inbox ${inboxId}: ${activeSessions.length} sessões ativas, ` +
            `${triggers.length} trigger(s) com frequência ${frequencyMinutes}min`
          );

          // Para cada sessão, faz UMA chamada GET e verifica TODOS os triggers
          for (const session of activeSessions) {
            try {
              await this.processSessionForMultipleTriggers(
                session,
                inbox,
                tenant,
                triggers
              );
            } catch (error: any) {
              logger.error(
                `[ConversationTriggerService] Erro ao processar sessão ${session.id}: ${error.message}`
              );
              // Continua com próxima sessão mesmo se houver erro
            }
          }
        } catch (error: any) {
          logger.error(
            `[ConversationTriggerService] Erro ao processar inbox ${inboxId}: ${error.message}`
          );
          // Continua com próximo inbox mesmo se houver erro
        }
      }
    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao verificar conversas por frequência: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * OTIMIZADO: Processa uma sessão para múltiplos triggers
   * Faz UMA chamada GET da conversa e verifica todos os triggers
   */
  private static async processSessionForMultipleTriggers(
    session: any,
    inbox: any,
    tenant: any,
    triggers: any[]
  ): Promise<void> {
    // Busca conversa UMA VEZ para todos os triggers
    const chatwootUrl = tenant.chatwoot_url || process.env.CHATWOOT_DEFAULT_URL;
    const chatwootApiToken =
      inbox.chatwoot_api_token ||
      tenant.chatwoot_token ||
      process.env.CHATWOOT_DEFAULT_TOKEN;
    const accountId = tenant.chatwoot_account_id;

    if (!chatwootUrl || !chatwootApiToken || !accountId) {
      logger.warn(
        `[ConversationTriggerService] Configuração do Chatwoot incompleta para tenant ${tenant.id}`
      );
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 [ConversationTriggerService] PROCESSANDO SESSÃO (OTIMIZADO)');
    console.log('='.repeat(80));
    console.log(`   • Session ID: ${session.id}`);
    console.log(`   • Conversation ID: ${session.conversation_id}`);
    console.log(`   • Typebot Session ID: ${session.typebot_session_id}`);
    console.log(`   • Triggers a verificar: ${triggers.length} (mesma frequência)`);
    console.log(`   • Inbox ID: ${inbox.id}`);
    console.log('='.repeat(80) + '\n');

    // Busca conversa UMA VEZ
    let conversation;
    try {
      const chatwootClient = new ChatwootClient(chatwootUrl, chatwootApiToken);
      conversation = await chatwootClient.getConversation(accountId, session.conversation_id);
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ [ConversationTriggerService] CONVERSA BUSCADA COM SUCESSO (OTIMIZADO)');
      console.log('='.repeat(80));
      console.log(`   • Conversation ID: ${conversation.id}`);
      console.log(`   • Status: ${conversation.status}`);
      console.log(`   • Assignee ID: ${conversation.assignee_id || 'null'}`);
      console.log(`   • Team ID: ${conversation.meta?.team?.id || 'null'}`);
      console.log(`   • Last Activity At: ${conversation.last_activity_at}`);
      console.log(`   • Esta conversa será verificada para ${triggers.length} trigger(s)`);
      console.log('='.repeat(80) + '\n');
    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao buscar conversa ${session.conversation_id}: ${error.message}`
      );
      return;
    }

    // Verifica CADA trigger com os mesmos dados da conversa
    for (const trigger of triggers) {
      try {
        // Verifica se este trigger está associado a este inbox
        const inboxIds = await TriggerModel.getInboxIdsForTrigger(trigger.id);
        if (!inboxIds.includes(inbox.id)) {
          continue; // Pula se trigger não está associado a este inbox
        }

        await this.processSessionWithConversation(
          session,
          inbox,
          tenant,
          trigger,
          conversation
        );
      } catch (error: any) {
        logger.error(
          `[ConversationTriggerService] Erro ao processar trigger ${trigger.id} para sessão ${session.id}: ${error.message}`
        );
        // Continua com próximo trigger mesmo se houver erro
      }
    }
  }

  /**
   * Processa uma sessão individual e verifica se deve acionar o comando
   * (Mantido para compatibilidade com chamadas individuais)
   */
  private static async processSession(
    session: any,
    inbox: any,
    tenant: any,
    trigger: any
  ): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [ConversationTriggerService] PROCESSANDO SESSÃO');
    console.log('='.repeat(80));
    console.log(`   • Session ID: ${session.id}`);
    console.log(`   • Conversation ID: ${session.conversation_id}`);
    console.log(`   • Typebot Session ID: ${session.typebot_session_id}`);
    console.log(`   • Trigger ID: ${trigger.id} (${trigger.name})`);
    console.log(`   • Inbox ID: ${inbox.id}`);
    
    // Verifica se este trigger JÁ FOI EXECUTADO para esta combinação:
    // conversa + trigger + sessão Typebot (execução única por combinação)
    const hasBeenExecuted = await TriggerExecutionModel.hasBeenExecuted(
      session.conversation_id,
      trigger.id,
      session.typebot_session_id
    );
    
    if (hasBeenExecuted) {
      console.log(`   ❌ Trigger ${trigger.id} (${trigger.name}) JÁ FOI EXECUTADO`);
      console.log(`      Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
      console.log(`      Cada combinação só pode executar UMA VEZ - pulando`);
      console.log('='.repeat(80) + '\n');
      logger.info(
        `[ConversationTriggerService] Trigger ${trigger.id} (${trigger.name}) já foi executado ` +
        `para conversa ${session.conversation_id} com sessão Typebot ${session.typebot_session_id}, pulando`
      );
      return;
    }
    
    console.log(`   ✅ Combinação ainda NÃO foi executada`);
    console.log(`      Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
    console.log('='.repeat(80) + '\n');

    // Busca conversa no Chatwoot
    const chatwootUrl = tenant.chatwoot_url || process.env.CHATWOOT_DEFAULT_URL;
    const chatwootApiToken =
      inbox.chatwoot_api_token ||
      tenant.chatwoot_token ||
      process.env.CHATWOOT_DEFAULT_TOKEN;
    const accountId = tenant.chatwoot_account_id;

    if (!chatwootUrl || !chatwootApiToken || !accountId) {
      logger.warn(
        `[ConversationTriggerService] Configuração do Chatwoot incompleta para tenant ${tenant.id}`
      );
      console.log('\n' + '='.repeat(80));
      console.log('⚠️  [ConversationTriggerService] CONFIGURAÇÃO INCOMPLETA');
      console.log('='.repeat(80));
      console.log(`   • Tenant ID: ${tenant.id}`);
      console.log(`   • Chatwoot URL: ${chatwootUrl || 'NÃO CONFIGURADO'}`);
      console.log(`   • Chatwoot Token: ${chatwootApiToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
      console.log(`   • Account ID: ${accountId || 'NÃO CONFIGURADO'}`);
      console.log('='.repeat(80) + '\n');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 [ConversationTriggerService] BUSCANDO CONVERSA NO CHATWOOT');
    console.log('='.repeat(80));
    console.log(`   • Trigger: ${trigger.id} (${trigger.name})`);
    console.log(`   • Session ID: ${session.id}`);
    console.log(`   • Conversation ID: ${session.conversation_id}`);
    console.log(`   • Inbox ID: ${inbox.id} (Chatwoot Inbox: ${inbox.inbox_id})`);
    console.log(`   • Tenant ID: ${tenant.id} (${tenant.name})`);
    console.log(`   • Chatwoot URL: ${chatwootUrl}`);
    console.log(`   • Account ID: ${accountId}`);
    console.log('='.repeat(80) + '\n');

    let conversation;
    try {
      const chatwootClient = new ChatwootClient(chatwootUrl, chatwootApiToken);
      conversation = await chatwootClient.getConversation(accountId, session.conversation_id);
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ [ConversationTriggerService] CONVERSA BUSCADA COM SUCESSO');
      console.log('='.repeat(80));
      console.log(`   • Conversation ID: ${conversation.id}`);
      console.log(`   • Status: ${conversation.status}`);
      console.log(`   • Assignee ID: ${conversation.assignee_id || 'null'}`);
      console.log(`   • Team ID: ${conversation.meta?.team?.id || 'null'}`);
      console.log(`   • Last Activity At: ${conversation.last_activity_at}`);
      console.log('='.repeat(80) + '\n');
    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao buscar conversa ${session.conversation_id}: ${error.message}`
      );
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ConversationTriggerService] ERRO AO BUSCAR CONVERSA');
      console.error('='.repeat(80));
      console.error(`   • Conversation ID: ${session.conversation_id}`);
      console.error(`   • Account ID: ${accountId}`);
      console.error(`   • Erro: ${error.message}`);
      console.error('='.repeat(80) + '\n');
      return;
    }

    // Chama método reutilizável que processa com a conversa já buscada
    await this.processSessionWithConversation(
      session,
      inbox,
      tenant,
      trigger,
      conversation
    );
  }

  /**
   * Processa uma sessão com a conversa já buscada (otimizado)
   * Reutilizado tanto para processamento individual quanto em lote
   */
  private static async processSessionWithConversation(
    session: any,
    inbox: any,
    tenant: any,
    trigger: any,
    conversation: any
  ): Promise<void> {
    // Verifica se este trigger JÁ FOI EXECUTADO para esta combinação:
    // conversa + trigger + sessão Typebot (execução única por combinação)
    const hasBeenExecuted = await TriggerExecutionModel.hasBeenExecuted(
      session.conversation_id,
      trigger.id,
      session.typebot_session_id
    );
    
    if (hasBeenExecuted) {
      console.log(`   ❌ Trigger ${trigger.id} (${trigger.name}) JÁ FOI EXECUTADO`);
      console.log(`      Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
      console.log(`      Cada combinação só pode executar UMA VEZ - pulando`);
      logger.info(
        `[ConversationTriggerService] Trigger ${trigger.id} (${trigger.name}) já foi executado ` +
        `para conversa ${session.conversation_id} com sessão Typebot ${session.typebot_session_id}, pulando`
      );
      return;
    }
    
    // PRIMEIRO: Verifica condições do trigger no Chatwoot
    // Só executa se as condições forem atendidas
    const shouldTrigger = this.shouldTriggerCommand(conversation, trigger);
    
    if (!shouldTrigger) {
      console.log('\n' + '='.repeat(80));
      console.log('⏭️  [ConversationTriggerService] CONDIÇÕES NÃO ATENDIDAS');
      console.log('='.repeat(80));
      console.log(`   • Trigger ${trigger.id} (${trigger.name}) não será executado`);
      console.log(`   • Conversa ${session.conversation_id} não atende às condições do trigger`);
      console.log(`   • Nenhuma execução será registrada`);
      console.log('='.repeat(80) + '\n');
      
      logger.debug(
        `[ConversationTriggerService] Condições não atendidas para sessão ${session.id}, pulando`
      );
      return;
    }
    
    // Se chegou aqui, as condições foram atendidas
    // REGISTRA ANTES de executar (try-lock pattern) para evitar race conditions
    // Se o registro falhar (já existe), significa que outra execução já está em andamento
    const executionRecord = await TriggerExecutionModel.tryCreate({
      conversation_id: session.conversation_id,
      trigger_id: trigger.id,
      typebot_session_id: session.typebot_session_id,
      session_id: session.id,
    });
    
    if (!executionRecord) {
      // Já foi registrado (outra execução já está em andamento ou já foi executado)
      console.log('\n' + '='.repeat(80));
      console.log('⚠️  [ConversationTriggerService] TRIGGER JÁ FOI REGISTRADO');
      console.log('='.repeat(80));
      console.log(`   • Trigger ${trigger.id} (${trigger.name}) já foi registrado/executado`);
      console.log(`   • Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
      console.log(`   • Isso pode acontecer se múltiplas verificações ocorrerem simultaneamente`);
      console.log(`   • Pulando execução para evitar duplicatas`);
      console.log('='.repeat(80) + '\n');
      logger.info(
        `[ConversationTriggerService] Trigger ${trigger.id} já foi registrado para ` +
        `conversa ${session.conversation_id} com sessão Typebot ${session.typebot_session_id}, pulando`
      );
      return;
    }

    // Se chegou aqui, o registro foi criado com sucesso (lock adquirido)
    // Agora pode executar o comando com segurança
    console.log('\n' + '='.repeat(80));
    console.log('🔒 [ConversationTriggerService] LOCK ADQUIRIDO - EXECUTANDO TRIGGER');
    console.log('='.repeat(80));
    console.log(`   • Trigger ${trigger.id} (${trigger.name}) registrado com sucesso`);
    console.log(`   • Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
    console.log(`   • Executando comando para Typebot...`);
    console.log('='.repeat(80) + '\n');

    // Envia comando para o Typebot
    try {
      const typebotClient = new TypebotClient(
        inbox.typebot_base_url,
        inbox.typebot_api_key || undefined
      );

      logger.info(
        `[ConversationTriggerService] Enviando comando "${trigger.name}" ` +
        `para sessão ${session.id} (conversation: ${session.conversation_id})`
      );

      const typebotResponse = await typebotClient.sendCommand(
        session.typebot_session_id,
        trigger.name
      );

      console.log('\n' + '='.repeat(80));
      console.log('✅ [ConversationTriggerService] TRIGGER EXECUTADO COM SUCESSO');
      console.log('='.repeat(80));
      console.log(`   • Trigger ${trigger.id} (${trigger.name}) executado`);
      console.log(`   • Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
      console.log(`   • Execução já estava registrada (lock adquirido antes da execução)`);
      console.log(`   • Resposta do Typebot: ${typebotResponse.messages?.length || 0} mensagem(ns)`);
      console.log('='.repeat(80) + '\n');

      // PROCESSA A RESPOSTA DO TYPEBOT (envia para WhatsApp e Chatwoot)
      // Garante que arrays existam (já garantido no TypebotClient, mas por segurança)
      const messages = typebotResponse.messages || [];
      const logs = typebotResponse.logs || [];
      
      // Verifica se há mensagens para enviar
      const hasMessages = messages.length > 0;
      
      // Verifica se há logs (mudança de status, etc)
      const hasLogs = logs.length > 0;
      
      if (hasMessages) {
        console.log('\n' + '='.repeat(80));
        console.log('📤 [ConversationTriggerService] PROCESSANDO RESPOSTA DO TRIGGER');
        console.log('='.repeat(80));
        console.log(`   • Processando ${messages.length} mensagem(ns) da resposta`);
        if (hasLogs) {
          console.log(`   • Logs encontrados: ${logs.length} log(s)`);
          logs.forEach((log: any, index: number) => {
            console.log(`     ${index + 1}. ${log.description || 'Sem descrição'}`);
          });
        }
        console.log('='.repeat(80) + '\n');
        
        await this.processTypebotResponse(
          typebotResponse,
          session,
          inbox,
          tenant
        );
      } else {
        // Mesmo sem mensagens, loga informações sobre a resposta
        console.log('\n' + '='.repeat(80));
        console.log('⚠️  [ConversationTriggerService] RESPOSTA SEM MENSAGENS');
        console.log('='.repeat(80));
        console.log(`   • O Typebot não retornou mensagens na resposta`);
        console.log(`   • Nada será enviado para WhatsApp/Chatwoot`);
        
        if (hasLogs) {
          console.log(`   • Logs encontrados: ${logs.length} log(s)`);
          logs.forEach((log: any, index: number) => {
            console.log(`     ${index + 1}. Status: ${log.status || 'N/A'}`);
            console.log(`        Descrição: ${log.description || 'Sem descrição'}`);
            if (log.details) {
              try {
                const details = JSON.parse(log.details);
                console.log(`        Detalhes:`, JSON.stringify(details, null, 2));
              } catch {
                console.log(`        Detalhes: ${log.details}`);
              }
            }
          });
          console.log(`   • ⚠️  NOTA: Logs indicam ações executadas pelo Typebot (ex: mudança de status)`);
          console.log(`   • ⚠️  NOTA: Essas ações já foram processadas via webhook do Typebot`);
        }
        
        console.log('='.repeat(80) + '\n');
        
        // Loga sucesso mesmo sem mensagens (o comando foi executado)
        logger.info(
          `[ConversationTriggerService] ✅ Comando "${trigger.name}" executado com sucesso ` +
          `(sem mensagens para enviar, mas com ${logs.length} log(s))`
        );
      }

      logger.info(
        `[ConversationTriggerService] ✅ Comando "${trigger.name}" enviado com sucesso ` +
        `para sessão ${session.id} (conversa ${session.conversation_id}, typebot session ${session.typebot_session_id}). ` +
        `Resposta do Typebot: ${typebotResponse.messages?.length || 0} mensagem(ns). ` +
        `Execução registrada antes da execução (lock pattern - garante execução única)`
      );
    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao enviar comando para Typebot: ${error.message}`,
        { error }
      );
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ConversationTriggerService] ERRO AO EXECUTAR TRIGGER');
      console.error('='.repeat(80));
      console.error(`   • Trigger ${trigger.id} (${trigger.name})`);
      console.error(`   • Combinação: Conversa ${session.conversation_id} + Trigger ${trigger.id} + Typebot Session ${session.typebot_session_id}`);
      console.error(`   • Erro: ${error.message}`);
      console.error(`   ⚠️  NOTA: O registro já foi criado, então este trigger não executará novamente`);
      console.error('='.repeat(80) + '\n');
      
      // O registro já foi criado, então mesmo em caso de erro, este trigger não executará novamente
      // Isso é intencional para evitar loops infinitos em caso de erros intermitentes
    }
  }

  /**
   * Processa a resposta do Typebot e envia para WhatsApp e Chatwoot
   * Similar ao processamento feito no MessageHandler
   */
  private static async processTypebotResponse(
    typebotResponse: TypebotResponse,
    session: any,
    inbox: any,
    tenant: any
  ): Promise<void> {
    try {
      const phoneNumber = session.phone_number;
      const conversationId = session.conversation_id;

      // Cria cliente WhatsApp
      const whatsappClient = new WhatsAppClient(
        inbox.whatsapp_phone_number_id,
        inbox.whatsapp_access_token,
        inbox.whatsapp_api_version
      );

      // Transforma resposta do Typebot em mensagens WhatsApp
      // IMPORTANTE: Quando é resposta de comando/trigger, ignora o input (menu inicial)
      // Apenas envia as mensagens de texto, não os botões do menu
      const typebotResponseWithoutInput = {
        ...typebotResponse,
        input: undefined, // Remove input para não processar menu inicial em respostas de comando
      };
      
      console.log('\n' + '='.repeat(80));
      console.log('📝 [ConversationTriggerService] PROCESSANDO RESPOSTA DE COMANDO');
      console.log('='.repeat(80));
      console.log(`   • Mensagens de texto: ${typebotResponse.messages?.filter(m => m.type === 'text').length || 0}`);
      console.log(`   • Input (menu) removido: ${typebotResponse.input ? 'SIM (ignorado)' : 'N/A'}`);
      console.log(`   • Apenas mensagens de texto serão enviadas (menu inicial não será processado)`);
      
      // Verifica se há logs indicando mudança de status
      const hasStatusChangeLog = typebotResponse.logs?.some((log: any) => 
        log.description?.toLowerCase().includes('status changed') ||
        log.description?.toLowerCase().includes('resolved')
      );
      
      if (hasStatusChangeLog) {
        console.log(`   ⚠️  ATENÇÃO: Logs indicam mudança de status na resposta`);
        console.log(`   • As mensagens serão enviadas PRIMEIRO`);
        console.log(`   • Aguardando wait (se houver) antes de qualquer ação de status`);
        console.log(`   • Isso evita que mensagens reabram conversas já resolvidas`);
      }
      
      console.log('='.repeat(80) + '\n');
      
      const whatsappMessages = transformTypebotResponseToWhatsApp(
        typebotResponseWithoutInput,
        phoneNumber
      );

      if (whatsappMessages.length === 0) {
        console.log('   ⚠️  Nenhuma mensagem WhatsApp gerada da resposta do Typebot');
        return;
      }

      // Processa clientSideActions para extrair wait (pega apenas o primeiro)
      const waitDelayMs = this.extractWaitDelay(typebotResponse);

      if (waitDelayMs > 0) {
        console.log(
          `   ⏱️ Wait detectado: ${waitDelayMs}ms (${waitDelayMs / 1000}s). ` +
          `Aplicando entre cada uma das ${whatsappMessages.length} mensagem(ns)...`
        );
      } else {
        console.log(
          `   ⏱️ Nenhum wait detectado. Usando delay padrão de 500ms entre mensagens.`
        );
      }

      // ORDEM CORRETA DE EXECUÇÃO (CRÍTICO PARA EVITAR REABERTURA):
      // 1. PRIMEIRO: Envia todas as mensagens (ANTES de qualquer mudança de status)
      // 2. SEGUNDO: Aguarda o wait (se houver)
      // 3. TERCEIRO: Processa logs/ações de status (se houver) - apenas informativo
      //
      // IMPORTANTE: Os logs do Typebot indicam ações JÁ EXECUTADAS via webhook.
      // Se o webhook mudou o status para "resolved" ANTES de enviar as mensagens,
      // as mensagens reabrirão a conversa. Por isso enviamos mensagens PRIMEIRO.
      
      // Verifica se há logs de mudança de status
      const statusChangeLog = typebotResponse.logs?.find((log: any) => 
        log.description?.toLowerCase().includes('status changed') ||
        log.description?.toLowerCase().includes('resolved')
      );
      
      if (statusChangeLog) {
        console.log('\n' + '='.repeat(80));
        console.log('⚠️  [ConversationTriggerService] MUDANÇA DE STATUS DETECTADA');
        console.log('='.repeat(80));
        console.log(`   • Log: ${statusChangeLog.description}`);
        console.log(`   • Ação: O Typebot executou webhook que mudou o status`);
        console.log(`   • ESTRATÉGIA: Enviando mensagens PRIMEIRO para evitar reabertura`);
        console.log(`   • Se a conversa já foi resolvida, as mensagens serão enviadas antes`);
        console.log('='.repeat(80) + '\n');
      }
      
      // 1. ENVIA TODAS AS MENSAGENS PRIMEIRO (ANTES DE QUALQUER AÇÃO DE STATUS)
      for (let i = 0; i < whatsappMessages.length; i++) {
        const whatsappMessage = whatsappMessages[i];
        
        // Aplica delay ANTES de enviar a mensagem (exceto a primeira)
        if (i > 0) {
          const delayToApply = waitDelayMs > 0 ? waitDelayMs : 500;
          console.log(
            `   ⏳ Aguardando ${delayToApply}ms (${delayToApply / 1000}s) antes de enviar mensagem ${i + 1}/${whatsappMessages.length}`
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
        if (session.id) {
          let content: string | null = null;
          
          if (whatsappMessage.type === 'text') {
            content = whatsappMessage.text.body;
          } else if (whatsappMessage.type === 'image') {
            content = `[Imagem: ${whatsappMessage.image.link}]`;
          } else if (whatsappMessage.type === 'interactive') {
            if (whatsappMessage.interactive.type === 'cta_url') {
              content = `[Imagem Interativa com CTA: ${whatsappMessage.interactive.header.image.link} -> ${whatsappMessage.interactive.action.parameters.url}]`;
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
              sessionId: session.id,
              content,
              contentType: whatsappMessage.type,
              whatsappMessageId: response.messages[0]?.id,
              typebotResponse,
            },
          });
        }

        console.log(
          `   ✅ Mensagem ${i + 1}/${whatsappMessages.length} enviada para WhatsApp`
        );
      }
      
      // 2. AGUARDA O WAIT APÓS ENVIAR TODAS AS MENSAGENS
      // IMPORTANTE: O wait deve ser aplicado ANTES de qualquer ação de status
      // Isso garante que as mensagens sejam enviadas e processadas antes de resolver a conversa
      if (waitDelayMs > 0 && whatsappMessages.length > 0) {
        console.log(
          `   ⏳ Aguardando wait final de ${waitDelayMs}ms (${waitDelayMs / 1000}s) após enviar todas as mensagens`
        );
        await this.delay(waitDelayMs);
      }
      
      // 3. PROCESSA LOGS/AÇÕES DE STATUS POR ÚLTIMO (se houver)
      // Os logs do Typebot indicam ações já executadas (como mudança de status via webhook)
      // IMPORTANTE: As mensagens já foram enviadas, então mesmo que o status mude para "resolved",
      // as mensagens não reabrirão a conversa porque já foram processadas
      if (typebotResponse.logs && typebotResponse.logs.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 [ConversationTriggerService] LOGS DO TYPEBOT (apenas informativo)');
        console.log('='.repeat(80));
        typebotResponse.logs.forEach((log: any, index: number) => {
          console.log(`   ${index + 1}. [${log.status || 'info'}] ${log.description || 'N/A'}`);
          if (log.details) {
            try {
              const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
              if (details.payload) {
                console.log(`      Payload:`, JSON.stringify(details.payload, null, 2));
              }
            } catch {
              console.log(`      Detalhes: ${log.details}`);
            }
          }
        });
        console.log('='.repeat(80));
        console.log('   ✅ ORDEM DE EXECUÇÃO CORRETA:');
        console.log('      1. Mensagens enviadas PRIMEIRO');
        console.log('      2. Wait aguardado');
        console.log('      3. Ações de status executadas POR ÚLTIMO');
        console.log('   ℹ️  As mensagens foram enviadas ANTES de qualquer mudança de status');
        console.log('   ℹ️  Isso evita que mensagens reabram conversas já resolvidas');
        console.log('='.repeat(80) + '\n');
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ [ConversationTriggerService] RESPOSTA PROCESSADA COM SUCESSO');
      console.log('='.repeat(80));
      console.log(`   • ${whatsappMessages.length} mensagem(ns) enviada(s) para WhatsApp`);
      console.log(`   • Notas criadas no Chatwoot`);
      console.log(`   • Logs registrados`);
      console.log('='.repeat(80) + '\n');

    } catch (error: any) {
      logger.error(
        `[ConversationTriggerService] Erro ao processar resposta do Typebot: ${error.message}`,
        { error }
      );
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ConversationTriggerService] ERRO AO PROCESSAR RESPOSTA');
      console.error('='.repeat(80));
      console.error(`   • Erro: ${error.message}`);
      console.error('='.repeat(80) + '\n');
      throw error;
    }
  }

  /**
   * Extrai delay de wait dos clientSideActions
   */
  private static extractWaitDelay(typebotResponse: TypebotResponse): number {
    if (!typebotResponse.clientSideActions || typebotResponse.clientSideActions.length === 0) {
      return 0;
    }

    const waitAction = typebotResponse.clientSideActions.find(
      (action: any) => action.type === 'wait'
    );

    if (waitAction && waitAction.wait && waitAction.wait.secondsToWaitFor) {
      return waitAction.wait.secondsToWaitFor * 1000; // Converte para ms
    }

    return 0;
  }

  /**
   * Envia mensagem para WhatsApp
   */
  private static async sendWhatsAppMessage(
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

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se as condições do trigger foram atendidas
   */
  private static shouldTriggerCommand(conversation: any, trigger: any): boolean {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [ConversationTriggerService] VERIFICANDO CONDIÇÕES DO TRIGGER');
    console.log('='.repeat(80));
    console.log(`   • Trigger: ${trigger.id} (${trigger.name})`);
    console.log(`   • Conversation ID: ${conversation.id}`);
    console.log(`   • Status da Conversa: ${conversation.status}`);
    console.log(`   • Requer sem assignee/team: ${trigger.requires_no_assignee}`);
    console.log(`   • Tempo mínimo sem resposta: ${trigger.idle_minutes} minutos`);
    
    // Verifica se conversa está aberta
    if (conversation.status !== 'open') {
      console.log(`   ❌ Status da conversa é "${conversation.status}", não é "open"`);
      console.log('='.repeat(80) + '\n');
      return false;
    }
    console.log(`   ✅ Status da conversa é "open"`);

    // Verifica se requer ausência de assignee/team
    if (trigger.requires_no_assignee) {
      const hasAssignee = !!conversation.assignee_id;
      const hasTeam = !!(conversation.meta?.team?.id);
      
      console.log(`   • Assignee ID: ${conversation.assignee_id || 'null'}`);
      console.log(`   • Team ID: ${conversation.meta?.team?.id || 'null'}`);
      
      if (hasAssignee || hasTeam) {
        console.log(`   ❌ Conversa tem assignee ou team atribuído`);
        console.log(`      - Assignee ID: ${conversation.assignee_id || 'N/A'}`);
        console.log(`      - Team ID: ${conversation.meta?.team?.id || 'N/A'}`);
        console.log('='.repeat(80) + '\n');
        return false;
      }
      console.log(`   ✅ Conversa não tem assignee nem team atribuído`);
    }

    // Verifica tempo sem atividade (usa last_activity_at do Chatwoot em timestamp)
    const lastActivityAt = conversation.last_activity_at;
    if (!lastActivityAt) {
      console.log(`   ❌ Conversa não tem last_activity_at`);
      console.log('='.repeat(80) + '\n');
      return false;
    }

    // Calcula tempo desde última atividade usando timestamp do Chatwoot
    const now = Math.floor(Date.now() / 1000); // timestamp atual em segundos
    const minutesSinceLastActivity = (now - lastActivityAt) / 60; // last_activity_at já está em segundos
    
    console.log(`   • Last Activity At: ${lastActivityAt} (${new Date(lastActivityAt * 1000).toISOString()})`);
    console.log(`   • Agora: ${now} (${new Date(now * 1000).toISOString()})`);
    console.log(`   • Minutos desde última atividade: ${minutesSinceLastActivity.toFixed(2)}`);
    console.log(`   • Mínimo requerido: ${trigger.idle_minutes} minutos`);

    // Deve estar parada há pelo menos idle_minutes
    if (minutesSinceLastActivity < trigger.idle_minutes) {
      console.log(`   ❌ Conversa está parada há apenas ${minutesSinceLastActivity.toFixed(2)} minutos`);
      console.log(`      Precisa estar parada há pelo menos ${trigger.idle_minutes} minutos`);
      console.log('='.repeat(80) + '\n');
      return false;
    }

    console.log(`   ✅ Conversa está parada há ${minutesSinceLastActivity.toFixed(2)} minutos (>= ${trigger.idle_minutes} minutos)`);
    console.log(`   ✅ TODAS AS CONDIÇÕES ATENDIDAS - Trigger será acionado!`);
    console.log('='.repeat(80) + '\n');

    return true;
  }
}
