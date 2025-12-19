import axios, { AxiosInstance } from 'axios';
import { ConversationData } from '../types/chatwoot';

export interface CreateMessageData {
  content: string;
  message_type: 'outgoing';
  private: boolean;
}

export class ChatwootClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiToken: string;

  constructor(baseUrl: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        api_access_token: this.apiToken,
      },
      timeout: 10000,
    });
  }

  /**
   * Cria uma mensagem na conversa (comum ou privada)
   * @param accountId ID da conta no Chatwoot
   * @param conversationId ID da conversa
   * @param content Conteúdo da mensagem
   * @param isPrivate Se true, cria nota privada; se false, cria mensagem comum
   */
  async createMessage(
    accountId: number,
    conversationId: number,
    content: string,
    isPrivate: boolean = false
  ): Promise<void> {
    try {
      await this.client.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        {
          content,
          message_type: 'outgoing',
          private: isPrivate,
        } as CreateMessageData
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      const messageType = isPrivate ? 'nota privada' : 'mensagem comum';
      console.error(
        `Erro ao criar ${messageType} no Chatwoot: ${errorMessage}`
      );
      // Não lança erro para não interromper o fluxo principal
    }
  }

  /**
   * Cria uma nota privada em uma conversa
   * @deprecated Use createMessage com isPrivate=true
   */
  async createPrivateNote(
    accountId: number,
    conversationId: number,
    content: string
  ): Promise<void> {
    return this.createMessage(accountId, conversationId, content, true);
  }

  /**
   * Busca dados de uma conversa no Chatwoot
   */
  async getConversation(
    accountId: number,
    conversationId: number
  ): Promise<ConversationData> {
    const endpoint = `/api/v1/accounts/${accountId}/conversations/${conversationId}`;
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    console.log('\n' + '='.repeat(80));
    console.log('🌐 [ChatwootClient] BUSCANDO CONVERSA NO CHATWOOT (ÁTOMOSCHAT)');
    console.log('='.repeat(80));
    console.log(`   • Método: GET`);
    console.log(`   • URL: ${fullUrl}`);
    console.log(`   • Account ID: ${accountId}`);
    console.log(`   • Conversation ID: ${conversationId}`);
    console.log(`   • Header: api_access_token: ${this.apiToken.substring(0, 10)}...`);
    console.log('='.repeat(80) + '\n');
    
    try {
      const response = await this.client.get<ConversationData[]>(endpoint);
      
      // A API do Chatwoot pode retornar um array ou objeto único
      // Se for array, pega o primeiro elemento; se for objeto, usa diretamente
      const rawData = response.data;
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      if (!data) {
        console.error('[ChatwootClient] ❌ Conversa não encontrada na resposta');
        throw new Error('Conversa não encontrada');
      }
      
      // Log detalhado da resposta
      console.log('\n' + '='.repeat(80));
      console.log('✅ [ChatwootClient] RESPOSTA RECEBIDA DO CHATWOOT');
      console.log('='.repeat(80));
      console.log(`   • Status: ${response.status} ${response.statusText}`);
      console.log(`   • Tipo de Resposta: ${Array.isArray(response.data) ? 'Array' : 'Objeto'}`);
      console.log(`   • Conversation ID: ${data.id}`);
      console.log(`   • Status da Conversa: ${data.status}`);
      console.log(`   • Assignee ID: ${data.assignee_id || 'null'}`);
      console.log(`   • Team ID: ${data.meta?.team?.id || 'null'}`);
      console.log(`   • Last Activity At: ${data.last_activity_at} (timestamp)`);
      console.log(`   • Last Activity At (data): ${new Date(data.last_activity_at * 1000).toISOString()}`);
      console.log(`   • Can Reply: ${data.can_reply}`);
      console.log(`   • Unread Count: ${data.unread_count}`);
      
      if (data.meta?.team) {
        console.log(`   • Team: ID ${data.meta.team.id}, Nome: ${data.meta.team.name}`);
      }
      
      if (data.meta?.assignee) {
        console.log(`   • Assignee: ID ${data.meta.assignee.id}, Nome: ${data.meta.assignee.name || 'N/A'}`);
      }
      
      // Calcula minutos desde última atividade
      const now = Math.floor(Date.now() / 1000);
      const minutesSinceLastActivity = (now - data.last_activity_at) / 60;
      console.log(`   • Minutos desde última atividade: ${minutesSinceLastActivity.toFixed(2)}`);
      
      console.log('\n   📋 Dados completos da conversa:');
      console.log(JSON.stringify(data, null, 2));
      console.log('='.repeat(80) + '\n');
      
      return data;
    } catch (error: any) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ChatwootClient] ERRO AO BUSCAR CONVERSA NO CHATWOOT');
      console.error('='.repeat(80));
      console.error(`   • URL: ${fullUrl}`);
      console.error(`   • Account ID: ${accountId}`);
      console.error(`   • Conversation ID: ${conversationId}`);
      console.error(`   • Status Code: ${error.response?.status || 'N/A'}`);
      console.error(`   • Erro: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        console.error(`   • Resposta completa:`, JSON.stringify(error.response.data, null, 2));
      }
      console.error('='.repeat(80) + '\n');
      
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      throw new Error(
        `Erro ao buscar conversa no Chatwoot: ${errorMessage}`
      );
    }
  }
}

