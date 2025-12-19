import axios from 'axios';
import { OpenAIClient } from '../clients/openai.client';
import { isAudioFile } from '../utils/audio-detector.util';

export class TranscriptionService {
  /**
   * Transcreve um arquivo de áudio a partir de uma URL
   * @param url URL do arquivo de áudio
   * @param apiKey API key da OpenAI (do tenant)
   * @returns Texto transcrito
   */
  static async transcribeAudioFromUrl(
    url: string,
    apiKey: string
  ): Promise<string> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key é obrigatória para transcrição');
    }

    console.log(`[TranscriptionService] Iniciando transcrição de áudio: ${url}`);

    let audioBuffer: Buffer;

    try {
      // Baixa o arquivo da URL
      console.log(`[TranscriptionService] Baixando arquivo de áudio...`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos para download
        maxContentLength: 25 * 1024 * 1024, // 25MB máximo
      });

      audioBuffer = Buffer.from(response.data);
      console.log(
        `[TranscriptionService] Arquivo baixado: ${(audioBuffer.length / 1024).toFixed(2)}KB`
      );

      // Valida se é arquivo de áudio (verifica pelo Content-Type da resposta)
      const contentType = response.headers['content-type'] || '';
      const filename = extractFilenameFromUrl(url);

      if (!isAudioFile(contentType, url)) {
        console.warn(
          `[TranscriptionService] Arquivo pode não ser de áudio. Content-Type: ${contentType}, URL: ${url}`
        );
        // Continua mesmo assim, pois a OpenAI pode aceitar
      }

      // Valida tamanho do arquivo
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audioBuffer.length > maxSize) {
        throw new Error(
          `Arquivo muito grande: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB. ` +
          `Limite máximo: 25MB`
        );
      }

      if (audioBuffer.length === 0) {
        throw new Error('Arquivo de áudio está vazio');
      }

      // Cria cliente OpenAI e transcreve
      const openaiClient = new OpenAIClient(apiKey);
      const transcribedText = await openaiClient.transcribeAudio(
        audioBuffer,
        filename || 'audio.ogg',
        {
          model: 'gpt-4o-mini-transcribe',
          responseFormat: 'json', // Usa JSON para garantir que recebemos o objeto { text: "..." }
        }
      );

      if (!transcribedText || transcribedText.trim() === '') {
        console.warn('[TranscriptionService] Transcrição retornou texto vazio');
        // Retorna string vazia ao invés de mensagem de placeholder
        // Isso fará com que o áudio seja mantido nos anexos
        return '';
      }

      console.log(
        `[TranscriptionService] Transcrição concluída: ${transcribedText.length} caracteres`
      );
      console.log(
        `[TranscriptionService] Texto transcrito (primeiros 200 caracteres): ${transcribedText.substring(0, 200)}...`
      );

      return transcribedText.trim();
    } catch (error: any) {
      console.error('[TranscriptionService] Erro ao transcrever áudio:', {
        url,
        error: error.message,
        stack: error.stack,
      });

      // Re-lança o erro com contexto adicional
      if (error.message?.includes('timeout')) {
        throw new Error(
          `Timeout ao baixar ou transcrever áudio. URL: ${url}`
        );
      } else if (error.message?.includes('muito grande')) {
        throw error;
      } else if (error.response?.status === 404) {
        throw new Error(`Arquivo de áudio não encontrado na URL: ${url}`);
      } else {
        throw new Error(
          `Erro ao transcrever áudio: ${error.message || 'Erro desconhecido'}`
        );
      }
    }
  }
}

/**
 * Extrai o nome do arquivo de uma URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    
    // Se não tiver extensão, tenta pegar do query string ou usa padrão
    if (!filename || !filename.includes('.')) {
      // Tenta pegar do query string
      const fileParam = urlObj.searchParams.get('file') || urlObj.searchParams.get('filename');
      if (fileParam) {
        return fileParam;
      }
      return 'audio.ogg'; // Padrão
    }
    
    return filename;
  } catch {
    // Se falhar ao parsear URL, tenta extrair manualmente
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0];
    return lastPart || 'audio.ogg';
  }
}
