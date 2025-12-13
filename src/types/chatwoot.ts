export interface ChatwootRawWebhook {
  headers: Record<string, string>;
  params: Record<string, any>;
  query: Record<string, any>;
  body: {
    id?: number;
    account?: {
      id: number;
      name: string;
    };
    conversation?: {
      id: number;
      inbox_id: number;
      status?: string;
      contact_inbox?: {
        source_id: string;
      };
      messages?: Array<{
        id: number;
        content: string;
        message_type: number;
        content_type: string;
        source_id?: string;
      }>;
    };
    sender?: {
      id: number;
      identifier: string;
      phone_number: string;
      name: string;
    };
    content?: string;
    content_type?: string;
    message_type?: string | number;
    event: string;
    created_at?: string;
    inbox_id?: number;
    inbox?: {
      id: number;
      name: string;
    };
    messages?: Array<{
      id?: number;
      account_id?: number;
      content?: string | null;
      content_type?: string;
      message_type?: number;
      processed_message_content?: string | null;
      created_at?: number;
      attachments?: Array<{
        id: number;
        file_type: string;
        data_url: string;
        file_size?: number;
      }>;
      sender?: {
        name?: string;
      };
    }>;
    status?: string;
    contact_inbox?: {
      source_id?: string;
    };
    meta?: {
      sender?: {
        phone_number?: string;
        identifier?: string;
        name?: string;
      };
    };
  };
  webhookUrl?: string;
  executionMode?: string;
}

export interface NormalizedChatwootMessage {
  message: {
    message_id: string;
    chat_id: string;
    content_type: string;
    content: string | null;
    timestamp: string;
    content_url: string | null;
    remotejid: string;
    account: string;
  };
  attachments?: Array<{
    id: number;
    file_type: string;
    data_url: string;
    file_size?: number;
  }>;
  cw: {
    token: string;
    url: string;
  };
  session: string;
  name: string;
  inbox_id: number;
  account_id: number;
}

export type ChatwootEvent =
  | { type: 'message'; data: NormalizedChatwootMessage }
  | { type: 'conversation_resolved'; data: ConversationResolvedData }
  | { type: 'conversation_updated'; data: { status: string } }
  | { type: 'unknown'; data: any };

export interface ConversationResolvedData {
  accountId: number;
  inboxId: number;
  conversationId: number;
  status: string;
}

