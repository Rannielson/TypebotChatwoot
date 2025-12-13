import axios, { AxiosInstance } from 'axios';
import {
  WhatsAppMessage,
  WhatsAppApiResponse,
  WhatsAppTextMessage,
  WhatsAppImageMessage,
  WhatsAppInteractiveButtonsMessage,
  WhatsAppInteractiveListMessage,
  WhatsAppInteractiveCTAImageMessage,
} from '../types/whatsapp';

export class WhatsAppClient {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(
    phoneNumberId: string,
    accessToken: string,
    apiVersion: string = 'v21.0'
  ) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${apiVersion}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });
  }

  async sendTextMessage(
    to: string,
    text: string,
    previewUrl: boolean = false
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: previewUrl,
        body: text,
      },
    };

    return this.sendMessage(message);
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption: caption.substring(0, 1024) }),
      },
    };

    return this.sendMessage(message);
  }

  async sendInteractiveCTAImage(
    to: string,
    imageUrl: string,
    ctaUrl: string,
    bodyText: string = ' ',
    buttonTitle: string = 'Abrir Link',
    footerText?: string
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppInteractiveCTAImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        header: {
          type: 'image',
          image: {
            link: imageUrl,
          },
        },
        body: {
          text: bodyText,
        },
        ...(footerText && {
          footer: {
            text: footerText,
          },
        }),
        action: {
          name: 'cta_url',
          parameters: {
            display_text: buttonTitle.substring(0, 20),
            url: ctaUrl,
          },
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppApiResponse> {
    if (buttons.length > 3) {
      throw new Error('WhatsApp permite no máximo 3 botões por mensagem');
    }

    if (buttons.length === 0) {
      throw new Error('É necessário pelo menos 1 botão');
    }

    const message: WhatsAppInteractiveButtonsMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(headerText && {
          header: {
            type: 'text',
            text: headerText,
          },
        }),
        body: {
          text: bodyText,
        },
        ...(footerText && {
          footer: {
            text: footerText,
          },
        }),
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply' as const,
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20),
            },
          })),
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppApiResponse> {
    if (sections.length > 10) {
      throw new Error('WhatsApp permite no máximo 10 seções por lista');
    }

    sections.forEach((section, index) => {
      if (section.rows.length > 10) {
        throw new Error(`Seção ${index + 1} excede o limite de 10 itens`);
      }
    });

    const message: WhatsAppInteractiveListMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(headerText && {
          header: {
            type: 'text',
            text: headerText,
          },
        }),
        body: {
          text: bodyText,
        },
        ...(footerText && {
          footer: {
            text: footerText,
          },
        }),
        action: {
          button: buttonText.substring(0, 20),
          sections: sections.map((section) => ({
            title: section.title.substring(0, 24),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24),
              ...(row.description && {
                description: row.description.substring(0, 72),
              }),
            })),
          })),
        },
      },
    };

    return this.sendMessage(message);
  }

  private async sendMessage(
    message: WhatsAppMessage
  ): Promise<WhatsAppApiResponse> {
    try {
      const response = await this.client.post<WhatsAppApiResponse>(
        `/${this.phoneNumberId}/messages`,
        message
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message;
      throw new Error(`Erro ao enviar mensagem WhatsApp: ${errorMessage}`);
    }
  }
}

