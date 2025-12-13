export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppInteractiveButtonsMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button';
    header?: {
      type: 'text';
      text: string;
    } | {
      type: 'image';
      image: {
        link: string;
      };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

export interface WhatsAppInteractiveCTAImageMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'cta_url';
    header: {
      type: 'image';
      image: {
        link: string;
      };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      name: 'cta_url';
      parameters: {
        display_text: string;
        url: string;
      };
    };
  };
}

export interface WhatsAppInteractiveListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface WhatsAppInteractiveListMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button: string;
      sections: WhatsAppInteractiveListSection[];
    };
  };
}

export interface WhatsAppImageMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: {
    link: string;
    caption?: string;
  };
}

export type WhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppInteractiveButtonsMessage
  | WhatsAppInteractiveListMessage
  | WhatsAppImageMessage
  | WhatsAppInteractiveCTAImageMessage;

export interface WhatsAppApiResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

