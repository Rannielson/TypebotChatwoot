import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export interface TranscriptionOptions {
  model?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt';
  language?: string;
  prompt?: string;
  temperature?: number;
}

export class OpenAIClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: 'https://api.openai.com',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60 segundos
    });
  }

  /**
   * Transcreve um arquivo de áudio usando a API da OpenAI
   * @param audioBuffer Buffer do arquivo de áudio
   * @param filename Nome do arquivo (usado para determinar o formato)
   * @param options Opções adicionais para transcrição
   * @returns Texto transcrito
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<string> {
    try {
      // Valida tamanho do arquivo (limite da OpenAI: 25MB)
      const maxSize = 25 * 1024 * 1024; // 25MB em bytes
      if (audioBuffer.length > maxSize) {
        throw new Error(
          `Arquivo de áudio muito grande: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB. ` +
          `Limite máximo: 25MB`
        );
      }

      // Cria FormData para multipart/form-data
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: this.getContentType(filename),
      });
      formData.append('model', options.model || 'gpt-4o-mini-transcribe');
      // Por padrão usa 'json' que retorna { text: "..." }, mais confiável
      formData.append('response_format', options.responseFormat || 'json');

      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      console.log(`[OpenAIClient] Transcrevendo áudio: ${filename} (${(audioBuffer.length / 1024).toFixed(2)}KB)`);
      console.log(`[OpenAIClient] Modelo: ${options.model || 'gpt-4o-mini-transcribe'}`);
      console.log(`[OpenAIClient] Response format: ${options.responseFormat || 'json'}`);

      const responseFormat = options.responseFormat || 'json';
      
      const response = await this.client.post(
        '/v1/audio/transcriptions',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      let transcribedText = '';
      
      if (responseFormat === 'text') {
        // Quando response_format é 'text', a API retorna string diretamente
        // Mas o axios pode fazer parse, então verificamos ambos os casos
        if (typeof response.data === 'string') {
          transcribedText = response.data;
        } else if (response.data && typeof response.data === 'object' && 'text' in response.data) {
          transcribedText = (response.data as any).text || '';
        } else {
          // Se vier como buffer ou outro formato, tenta converter
          transcribedText = String(response.data || '').trim();
        }
        console.log(`[OpenAIClient] Resposta recebida (formato text):`, {
          type: typeof response.data,
          isString: typeof response.data === 'string',
          length: transcribedText.length,
        });
      } else {
        // Quando response_format é 'json', response.data é um objeto { text: "..." }
        const responseData = response.data as any;
        transcribedText = responseData?.text || '';
        console.log(`[OpenAIClient] Resposta recebida (formato json):`, {
          hasData: !!responseData,
          hasText: !!responseData?.text,
          dataKeys: responseData ? Object.keys(responseData) : [],
          textLength: transcribedText.length,
          fullResponse: JSON.stringify(responseData).substring(0, 500),
        });
      }

      console.log(`[OpenAIClient] Transcrição concluída. Tamanho do texto: ${transcribedText.length} caracteres`);
      
      if (transcribedText) {
        console.log(`[OpenAIClient] Texto transcrito: "${transcribedText.substring(0, 200)}${transcribedText.length > 200 ? '...' : ''}"`);
      } else {
        console.warn(`[OpenAIClient] ⚠️ Texto transcrito está vazio! Resposta completa:`, JSON.stringify(response.data, null, 2));
      }

      return transcribedText;
    } catch (error: any) {
      console.error('[OpenAIClient] Erro ao transcrever áudio:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 401) {
        throw new Error('OpenAI API key inválida ou expirada');
      } else if (error.response?.status === 429) {
        throw new Error('Limite de requisições da OpenAI excedido. Tente novamente mais tarde');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout ao transcrever áudio. Arquivo pode ser muito grande');
      } else if (error.message?.includes('muito grande')) {
        throw error;
      } else {
        throw new Error(
          `Erro ao transcrever áudio: ${error.response?.data?.error?.message || error.message}`
        );
      }
    }
  }

  /**
   * Determina o Content-Type baseado na extensão do arquivo
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      mpeg: 'audio/mpeg',
      mpga: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      oga: 'audio/ogg',
      flac: 'audio/flac',
    };
    return contentTypes[ext] || 'audio/mpeg';
  }
}
