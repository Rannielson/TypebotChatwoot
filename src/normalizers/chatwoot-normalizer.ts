import {
  ChatwootRawWebhook,
  NormalizedChatwootMessage,
  ChatwootEvent,
  ConversationResolvedData,
} from '../types/chatwoot';
import { env } from '../config/env';

export class ChatwootNormalizer {
  static normalize(rawWebhook: ChatwootRawWebhook): NormalizedChatwootMessage {
    const { body } = rawWebhook;

    const accountId =
      body.messages?.[0]?.account_id?.toString() ||
      body.account?.id?.toString() ||
      '0';

    const inboxId = body.inbox_id || body.inbox?.id || body.conversation?.inbox_id || 0;
    const conversationId = body.conversation?.id || (body.id || 0);
    const message = body.messages?.[0] || null;

    const content =
      (message && 'content' in message ? message.content : null) ||
      body.content ||
      (message && 'processed_message_content' in message ? message.processed_message_content : null) ||
      '';

    const attachments =
      (message && 'attachments' in message && message.attachments
        ? message.attachments.map((att: any) => ({
            id: att.id,
            file_type: att.file_type,
            data_url: att.data_url,
            file_size: att.file_size,
          }))
        : []) || [];

    const phoneNumber =
      body.conversation?.contact_inbox?.source_id ||
      body.contact_inbox?.source_id ||
      body.meta?.sender?.phone_number ||
      body.meta?.sender?.identifier?.replace('@s.whatsapp.net', '') ||
      body.sender?.phone_number ||
      body.sender?.identifier?.replace('@s.whatsapp.net', '') ||
      '';

    const remotejid = this.normalizePhoneNumber(phoneNumber);

    const name =
      body.meta?.sender?.name ||
      (message && message.sender ? message.sender.name : undefined) ||
      body.sender?.name ||
      'Usuário';

    const timestamp =
      (message && 'created_at' in message && message.created_at
        ? new Date(message.created_at * 1000).toISOString()
        : null) ||
      body.created_at ||
      new Date().toISOString();

    const chatwootUrl = this.extractChatwootUrl(rawWebhook);
    const chatwootToken = env.chatwoot.defaultToken || '';

    return {
      message: {
        message_id:
          (message && message.id ? message.id.toString() : null) ||
          (body.id ? body.id.toString() : null) ||
          '0',
        chat_id: conversationId.toString(),
        content_type:
          (message && 'content_type' in message ? message.content_type : null) ||
          body.content_type ||
          'text',
        content: content,
        timestamp: timestamp,
        content_url: attachments.length > 0 ? attachments[0].data_url : null,
        remotejid: remotejid,
        account: accountId,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      cw: {
        token: chatwootToken,
        url: chatwootUrl,
      },
      session: '',
      name: name,
      inbox_id: inboxId,
      account_id: parseInt(accountId),
    };
  }

  static detectEvent(rawWebhook: ChatwootRawWebhook): ChatwootEvent {
    const event = rawWebhook.body.event;
    const status = rawWebhook.body.status || rawWebhook.body.conversation?.status;

    if (event === 'automation_event.message_created') {
      return {
        type: 'message',
        data: this.normalize(rawWebhook),
      };
    }

    if (event === 'automation_event.conversation_updated') {
      if (status === 'resolved') {
        const accountId =
          rawWebhook.body.messages?.[0]?.account_id ||
          rawWebhook.body.account?.id ||
          (rawWebhook.body.meta?.sender as any)?.account?.id ||
          0;
        const inboxId =
          rawWebhook.body.inbox_id ||
          rawWebhook.body.inbox?.id ||
          rawWebhook.body.conversation?.inbox_id ||
          0;
        const conversationId =
          rawWebhook.body.conversation?.id || rawWebhook.body.id || 0;

        console.log(`[Normalizer] Extraindo dados de conversation_resolved:`, {
          accountId,
          inboxId,
          conversationId,
          status,
          hasMessages: !!rawWebhook.body.messages,
          hasAccount: !!rawWebhook.body.account,
        });

        return {
          type: 'conversation_resolved',
          data: {
            accountId,
            inboxId,
            conversationId,
            status: 'resolved',
          },
        };
      }

      return {
        type: 'conversation_updated',
        data: { status: status || 'unknown' },
      };
    }

    return {
      type: 'unknown',
      data: rawWebhook.body,
    };
  }

  static isValid(rawWebhook: ChatwootRawWebhook): boolean {
    if (!rawWebhook.body) return false;

    if (rawWebhook.body.event === 'automation_event.message_created') {
      if (!rawWebhook.body.messages || rawWebhook.body.messages.length === 0) {
        return false;
      }

      const message = rawWebhook.body.messages[0];
      if (message.message_type === 1) {
        return false;
      }

      if (
        !message.content &&
        (!message.attachments || message.attachments.length === 0)
      ) {
        return false;
      }

      return true;
    }

    if (rawWebhook.body.event === 'automation_event.conversation_updated') {
      return !!rawWebhook.body.id || !!rawWebhook.body.conversation?.id;
    }

    return false;
  }

  private static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    return phone.replace(/[^\d]/g, '').replace('@s.whatsapp.net', '');
  }

  private static extractChatwootUrl(rawWebhook: ChatwootRawWebhook): string {
    if (rawWebhook.webhookUrl) {
      try {
        const url = new URL(rawWebhook.webhookUrl);
        return `${url.protocol}//${url.host}`;
      } catch {
        // Fallback
      }
    }

    const host =
      rawWebhook.headers['x-forwarded-host'] || rawWebhook.headers['host'];

    if (host) {
      const proto = rawWebhook.headers['x-forwarded-proto'] || 'https';
      return `${proto}://${host}`;
    }

    return env.chatwoot.defaultUrl;
  }
}

