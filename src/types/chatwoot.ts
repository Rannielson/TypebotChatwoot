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
      assignee_id?: number | null;
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
      conversation?: {
        assignee_id?: number | null;
      };
    }>;
    status?: string;
    assignee_id?: number | null;
    contact_inbox?: {
      source_id?: string;
    };
    meta?: {
      sender?: {
        phone_number?: string;
        identifier?: string;
        name?: string;
      };
      team?: {
        id: number;
        name: string;
      } | null;
      assignee?: {
        id: number;
        name?: string;
      } | null;
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

export interface PauseSessionData {
  accountId: number;
  inboxId: number;
  conversationId: number;
  phoneNumber: string;
}

export interface ConversationData {
  id: number;
  account_id: number;
  inbox_id: number;
  uuid?: string;
  status: string;
  assignee_id: number | null;
  last_activity_at: number;
  created_at: number;
  timestamp: number;
  can_reply: boolean;
  unread_count: number;
  priority?: number | null;
  waiting_since?: number;
  muted?: boolean;
  snoozed_until?: number | null;
  labels?: Array<{ id: number; title: string }>;
  meta?: {
    sender?: {
      id: number;
      name: string;
      phone_number: string;
      identifier: string;
      email?: string | null;
      thumbnail?: string;
      last_activity_at?: number;
      created_at?: number;
      additional_attributes?: Record<string, any>;
      custom_attributes?: Record<string, any>;
    };
    channel?: string;
    team?: {
      id: number;
      name: string;
    } | null;
    assignee?: {
      id: number;
      name?: string;
      available_name?: string;
    } | null;
    hmac_verified?: boolean;
  };
  messages?: Array<{
    id: number;
    content: string;
    created_at: number;
    conversation?: {
      assignee_id: number | null;
      team_id?: number | null;
      last_activity_at: number;
      contact_inbox?: {
        source_id: string;
      };
    };
  }>;
  last_non_activity_message?: {
    id: number;
    content: string;
    created_at: number;
  };
  agent_last_seen_at?: number;
  assignee_last_seen_at?: number;
  contact_last_seen_at?: number;
  first_reply_created_at?: number;
  sla_policy_id?: number | null;
  sla_events?: Array<any>;
}

