import { redis } from '../config/redis';
import {
  SessionModel,
  CreateSessionData,
  SessionHistory,
} from '../models/session.model';
import { ButtonMappingModel } from '../models/button-mapping.model';
import { TypebotResponse, TypebotChoiceInput } from '../types/typebot';

interface SessionData {
  sessionId: string;
  resultId?: string;
  typebotPublicId: string;
  buttonMappings: Record<string, string>;
  lastUpdate: string;
}

export class SessionService {
  private static getSessionKey(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): string {
    return `session:${tenantId}:${inboxId}:${conversationId}:${phoneNumber}`;
  }

  static async getSession(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<SessionData | null> {
    const key = this.getSessionKey(tenantId, inboxId, conversationId, phoneNumber);
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Tenta buscar no banco de dados
    const dbSession = await SessionModel.findActive(
      tenantId,
      inboxId,
      conversationId,
      phoneNumber
    );

    if (dbSession && dbSession.status === 'active') {
      // Restaura no Redis
      const sessionData: SessionData = {
        sessionId: dbSession.typebot_session_id,
        resultId: dbSession.typebot_result_id || undefined,
        typebotPublicId: dbSession.typebot_public_id,
        buttonMappings: {},
        lastUpdate: dbSession.updated_at.toISOString(),
      };

      // Carrega mapeamentos de botões
      const mappings = await ButtonMappingModel.findBySessionId(dbSession.id);
      mappings.forEach((m) => {
        sessionData.buttonMappings[m.button_title] = m.outgoing_edge_id;
      });

      await this.saveSession(
        tenantId,
        inboxId,
        conversationId,
        phoneNumber,
        sessionData
      );

      return sessionData;
    }

    return null;
  }

  static async saveSession(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string,
    sessionData: SessionData
  ): Promise<void> {
    const key = this.getSessionKey(tenantId, inboxId, conversationId, phoneNumber);
    await redis.set(key, JSON.stringify(sessionData), 24 * 60 * 60); // 24 horas
  }

  static async createOrUpdateSession(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string,
    typebotPublicId: string,
    typebotResponse: TypebotResponse,
    contactName?: string
  ): Promise<SessionData> {
    const sessionData: SessionData = {
      sessionId: typebotResponse.sessionId,
      resultId: typebotResponse.resultId,
      typebotPublicId,
      buttonMappings: {},
      lastUpdate: new Date().toISOString(),
    };

    // Salva mapeamento de botões se houver
    if (typebotResponse.input?.type === 'choice input') {
      const choiceInput = typebotResponse.input as TypebotChoiceInput;
      const dbSession = await SessionModel.findByTypebotSessionId(
        typebotResponse.sessionId
      );

      if (dbSession) {
        // Limpa mapeamentos antigos
        await ButtonMappingModel.deleteBySessionId(dbSession.id);

        // Cria novos mapeamentos apenas para itens com outgoingEdgeId válido
        for (const item of choiceInput.items) {
          // Valida se outgoingEdgeId existe e não é null/undefined
          if (item.outgoingEdgeId && typeof item.outgoingEdgeId === 'string' && item.outgoingEdgeId.trim() !== '') {
            await ButtonMappingModel.create({
              session_id: dbSession.id,
              button_title: item.content,
              outgoing_edge_id: item.outgoingEdgeId,
            });

            sessionData.buttonMappings[item.content] = item.outgoingEdgeId;
          } else {
            console.warn(
              `[SessionService] Item de botão sem outgoingEdgeId válido ignorado:`,
              {
                buttonTitle: item.content,
                itemId: item.id,
                outgoingEdgeId: item.outgoingEdgeId,
              }
            );
          }
        }
      }
    }

    // Salva no Redis
    await this.saveSession(
      tenantId,
      inboxId,
      conversationId,
      phoneNumber,
      sessionData
    );

    // Valida sessionId antes de persistir no banco de dados
    if (!typebotResponse.sessionId) {
      console.error(`[SessionService] ❌ Tentativa de criar sessão sem sessionId!`, {
        tenantId,
        inboxId,
        conversationId,
        phoneNumber,
        typebotPublicId,
        typebotResponse: JSON.stringify(typebotResponse, null, 2),
      });
      throw new Error('Não é possível criar sessão sem sessionId do Typebot');
    }

    // Persiste no banco de dados
    const dbSession = await SessionModel.create({
      tenant_id: tenantId,
      inbox_id: inboxId,
      conversation_id: conversationId,
      phone_number: phoneNumber,
      contact_name: contactName,
      typebot_session_id: typebotResponse.sessionId,
      typebot_result_id: typebotResponse.resultId,
      typebot_public_id: typebotPublicId,
      status: 'active',
    });

    return sessionData;
  }

  static async getButtonMapping(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string,
    buttonTitle: string
  ): Promise<string | null> {
    const session = await this.getSession(
      tenantId,
      inboxId,
      conversationId,
      phoneNumber
    );

    if (!session) {
      return null;
    }

    return session.buttonMappings[buttonTitle] || null;
  }

  static async closeSession(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<void> {
    console.log(`[SessionService] Fechando sessão - Tenant: ${tenantId}, Inbox: ${inboxId}, Conversation: ${conversationId}`);
    
    // Fecha no banco de dados
    const result = await SessionModel.closeByConversation(tenantId, inboxId, conversationId);
    console.log(`[SessionService] Sessões fechadas no banco: ${result || 0}`);

    // Remove do Redis (busca todas as sessões da conversa)
    const pattern = `session:${tenantId}:${inboxId}:${conversationId}:*`;
    const keys = await redis.keys(pattern);
    console.log(`[SessionService] Chaves encontradas no Redis: ${keys.length}`);

    for (const key of keys) {
      await redis.del(key);
      console.log(`[SessionService] Chave removida do Redis: ${key}`);
    }

    console.log(`[SessionService] ✅ Sessão encerrada completamente`);
  }

  static async getSessionsByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<SessionHistory[]> {
    return await SessionModel.findByConversation(tenantId, inboxId, conversationId);
  }

  /**
   * Pausa todas as sessões ativas de uma conversa.
   * Remove/invalida o cache do Redis para essas sessões.
   * 
   * @param tenantId ID do tenant
   * @param inboxId ID interno do inbox
   * @param conversationId ID da conversa no Chatwoot
   * @returns Número de sessões pausadas
   */
  static async pauseSessionByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<number> {
    console.log(`[SessionService] Pausando sessões - Tenant: ${tenantId}, Inbox: ${inboxId}, Conversation: ${conversationId}`);
    
    // Pausa no banco de dados
    const pausedCount = await SessionModel.pauseByConversation(tenantId, inboxId, conversationId);
    console.log(`[SessionService] Sessões pausadas no banco: ${pausedCount}`);

    // Remove/invalida cache do Redis (busca todas as sessões da conversa)
    const pattern = `session:${tenantId}:${inboxId}:${conversationId}:*`;
    const keys = await redis.keys(pattern);
    console.log(`[SessionService] Chaves encontradas no Redis para invalidar: ${keys.length}`);

    for (const key of keys) {
      await redis.del(key);
      console.log(`[SessionService] Chave removida do Redis: ${key}`);
    }

    console.log(`[SessionService] ✅ Sessões pausadas completamente (${pausedCount} sessões)`);
    return pausedCount;
  }

  /**
   * Retoma (ativa) todas as sessões pausadas de uma conversa.
   * Remove/invalida o cache do Redis para essas sessões para forçar recarregamento.
   * 
   * @param tenantId ID do tenant
   * @param inboxId ID interno do inbox
   * @param conversationId ID da conversa no Chatwoot
   * @returns Número de sessões retomadas
   */
  static async resumeSessionByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<number> {
    console.log(`[SessionService] Retomando sessões - Tenant: ${tenantId}, Inbox: ${inboxId}, Conversation: ${conversationId}`);
    
    // Retoma no banco de dados
    const resumedCount = await SessionModel.resumeByConversation(tenantId, inboxId, conversationId);
    console.log(`[SessionService] Sessões retomadas no banco: ${resumedCount}`);

    // Remove/invalida cache do Redis (busca todas as sessões da conversa)
    const pattern = `session:${tenantId}:${inboxId}:${conversationId}:*`;
    const keys = await redis.keys(pattern);
    console.log(`[SessionService] Chaves encontradas no Redis para invalidar: ${keys.length}`);

    for (const key of keys) {
      await redis.del(key);
      console.log(`[SessionService] Chave removida do Redis: ${key}`);
    }

    console.log(`[SessionService] ✅ Sessões retomadas completamente (${resumedCount} sessões)`);
    return resumedCount;
  }
}

