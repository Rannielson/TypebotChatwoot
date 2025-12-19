/**
 * Utilitário para detectar se um arquivo é de áudio
 */

/**
 * Verifica se um arquivo é de áudio baseado no tipo MIME ou extensão da URL
 * @param fileType Tipo do arquivo (ex: "audio", "audio/ogg", "audio/mpeg")
 * @param url URL do arquivo (opcional, usado como fallback para verificar extensão)
 * @returns true se for um arquivo de áudio
 */
export function isAudioFile(fileType: string, url?: string): boolean {
  // Normaliza o tipo para lowercase
  const normalizedType = (fileType || '').toLowerCase().trim();

  // Verifica se o tipo começa com "audio/"
  if (normalizedType.startsWith('audio/')) {
    console.log(`[isAudioFile] Detectado por file_type (audio/): ${normalizedType}`);
    return true;
  }

  // Verifica se o tipo é exatamente "audio"
  if (normalizedType === 'audio') {
    console.log(`[isAudioFile] Detectado por file_type (audio): ${normalizedType}`);
    return true;
  }

  // Se não encontrou pelo tipo, tenta pela extensão da URL
  if (url) {
    const extension = extractExtension(url);
    const audioExtensions = [
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a',
      'wav', 'webm', 'ogg', 'oga', 'flac'
    ];
    
    if (extension && audioExtensions.includes(extension)) {
      console.log(`[isAudioFile] Detectado por extensão da URL: ${extension} (URL: ${url})`);
      return true;
    } else {
      console.log(`[isAudioFile] Extensão não reconhecida: "${extension}" (URL: ${url})`);
    }
  }

  console.log(`[isAudioFile] Arquivo NÃO é áudio. file_type="${normalizedType}", url="${url}"`);
  return false;
}

/**
 * Extrai a extensão de uma URL ou nome de arquivo
 * @param url URL ou nome de arquivo
 * @returns Extensão do arquivo (sem o ponto)
 */
function extractExtension(url: string): string {
  if (!url) return '';
  
  // Remove query parameters e fragmentos
  const cleanUrl = url.split('?')[0].split('#')[0];
  
  // Remove a barra final se houver
  const trimmedUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
  
  // Extrai a extensão do último segmento da URL
  const lastSegment = trimmedUrl.split('/').pop() || '';
  const parts = lastSegment.split('.');
  
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase();
    // Remove qualquer caractere inválido da extensão
    return ext.replace(/[^a-z0-9]/g, '');
  }
  
  return '';
}

/**
 * Lista de tipos MIME de áudio suportados
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp3',
];

/**
 * Lista de extensões de áudio suportadas
 */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3', 'mp4', 'mpeg', 'mpga', 'm4a',
  'wav', 'webm', 'ogg', 'oga', 'flac'
];
