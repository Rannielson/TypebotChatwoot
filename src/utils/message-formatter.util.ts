import { WhatsAppMessage } from '../types/whatsapp';

/**
 * Converte mensagem WhatsApp para texto simples para nota privada no Chatwoot
 */
export function formatWhatsAppMessageForChatwoot(
  message: WhatsAppMessage
): string {
  if (message.type === 'text') {
    return message.text.body;
  }

  if (message.type === 'image') {
    return `[Imagem: ${message.image.link}]${message.image.caption ? `\n${message.image.caption}` : ''}`;
  }

  if (message.type === 'interactive') {
    // Mensagem interativa com CTA URL (tipo cta_url)
    if (message.interactive.type === 'cta_url') {
      let text = message.interactive.body.text;
      
      // Adiciona informação sobre a imagem do header
      if (message.interactive.header && 'image' in message.interactive.header) {
        text = `[Imagem: ${message.interactive.header.image.link}]\n\n${text}`;
      }
      
      if (message.interactive.footer?.text) {
        text = `${text}\n\n${message.interactive.footer.text}`;
      }

      // Adiciona informação do botão CTA
      const ctaButton = `${message.interactive.action.parameters.display_text} -> ${message.interactive.action.parameters.url}`;
      return `${text}\n\nCTA: ${ctaButton}`;
    }

    // Mensagem interativa com botões de resposta (tipo button)
    if (message.interactive.type === 'button') {
      let text = message.interactive.body.text;
      
      // Verifica se o header é do tipo text antes de acessar .text
      if (message.interactive.header && 'text' in message.interactive.header) {
        text = `${message.interactive.header.text}\n\n${text}`;
      } else if (message.interactive.header && 'image' in message.interactive.header) {
        // Se for imagem, adiciona informação sobre a imagem
        text = `[Imagem: ${message.interactive.header.image.link}]\n\n${text}`;
      }
      
      if (message.interactive.footer?.text) {
        text = `${text}\n\n${message.interactive.footer.text}`;
      }

      // Mapeia botões verificando o tipo (reply)
      const buttons = message.interactive.action.buttons
        .map((btn, index) => {
          if (btn.type === 'reply') {
            return `${index + 1}. ${btn.reply.title}`;
          }
          return `${index + 1}. [Botão desconhecido]`;
        })
        .join('\n');

      return `${text}\n\nOpções:\n${buttons}`;
    }

    if (message.interactive.type === 'list') {
      let text = message.interactive.body.text;
      if (message.interactive.header?.text) {
        text = `${message.interactive.header.text}\n\n${text}`;
      }
      if (message.interactive.footer?.text) {
        text = `${text}\n\n${message.interactive.footer.text}`;
      }

      const sections = message.interactive.action.sections
        .map((section) => {
          const rows = section.rows
            .map((row) => `  • ${row.title}${row.description ? ` - ${row.description}` : ''}`)
            .join('\n');
          return `${section.title}:\n${rows}`;
        })
        .join('\n\n');

      return `${text}\n\n${sections}`;
    }
  }

  return '[Mensagem não suportada]';
}

