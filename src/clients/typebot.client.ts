import axios, { AxiosInstance } from 'axios';
import {
  TypebotStartChatRequest,
  TypebotResponse,
} from '../types/typebot';

export class TypebotClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      timeout: 30000,
    });
  }

  async startChat(
    publicId: string,
    request: TypebotStartChatRequest = {}
  ): Promise<TypebotResponse> {
    try {
      console.log(`[TypebotClient] Iniciando chat - Public ID: ${publicId}, Request:`, JSON.stringify(request, null, 2));
      const response = await this.client.post<TypebotResponse | TypebotResponse[]>(
        `/api/v1/typebots/${publicId}/startChat`,
        request
      );
      
      // Typebot pode retornar array ou objeto direto
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      
      console.log(`[TypebotClient] Resposta recebida (tipo: ${Array.isArray(response.data) ? 'array' : 'objeto'}):`, {
        hasSessionId: !!data.sessionId,
        sessionId: data.sessionId,
        hasMessages: !!data.messages,
        messagesLength: data.messages?.length || 0,
        hasInput: !!data.input,
      });
      
      if (!data.sessionId) {
        console.error(`[TypebotClient] ❌ Resposta sem sessionId! Resposta completa:`, JSON.stringify(response.data, null, 2));
        throw new Error('Typebot não retornou sessionId na resposta');
      }
      
      return data;
    } catch (error: any) {
      console.error(`[TypebotClient] Erro ao iniciar chat:`, error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      throw new Error(
        `Erro ao iniciar chat no Typebot: ${errorMessage}`
      );
    }
  }

  async continueChat(
    sessionId: string,
    message: string,
    attachedFileUrls?: string[]
  ): Promise<TypebotResponse> {
    try {
      const body = attachedFileUrls && attachedFileUrls.length > 0
        ? {
            message: {
              type: 'text',
              text: message,
              attachedFileUrls: attachedFileUrls,
            }
          }
        : { message };

      console.log(`[TypebotClient] Continuando chat - Session ID: ${sessionId}, Message: ${message}`);
      const response = await this.client.post<TypebotResponse | TypebotResponse[]>(
        `/api/v1/sessions/${sessionId}/continueChat`,
        body
      );
      
      // Typebot pode retornar array ou objeto direto
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      
      console.log(`[TypebotClient] Resposta continueChat (tipo: ${Array.isArray(response.data) ? 'array' : 'objeto'}):`, {
        hasSessionId: !!data.sessionId,
        sessionId: data.sessionId,
        hasMessages: !!data.messages,
        messagesLength: data.messages?.length || 0,
        hasInput: !!data.input,
      });
      
      // Se não retornou sessionId, preserva o sessionId original
      if (!data.sessionId) {
        console.log(`[TypebotClient] ⚠️ continueChat não retornou sessionId, preservando o original: ${sessionId}`);
        data.sessionId = sessionId;
      }
      
      return data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      throw new Error(
        `Erro ao continuar chat no Typebot: ${errorMessage}`
      );
    }
  }
}

