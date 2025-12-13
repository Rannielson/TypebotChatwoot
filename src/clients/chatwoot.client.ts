import axios, { AxiosInstance } from 'axios';

export interface CreatePrivateNoteData {
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
   * Cria uma nota privada em uma conversa
   */
  async createPrivateNote(
    accountId: number,
    conversationId: number,
    content: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        {
          content,
          message_type: 'outgoing',
          private: true,
        } as CreatePrivateNoteData
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      console.error(
        `Erro ao criar nota privada no Chatwoot: ${errorMessage}`
      );
      // Não lança erro para não interromper o fluxo principal
    }
  }
}

