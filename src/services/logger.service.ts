import { MessageLogModel, CreateMessageLogData } from '../models/message-log.model';

export class LoggerService {
  static async logMessage(data: CreateMessageLogData): Promise<void> {
    try {
      await MessageLogModel.create(data);
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  static async logIncomingMessage(
    sessionId: number,
    content: string | null,
    contentType: string,
    chatwootMessageId?: string,
    attachments?: any
  ): Promise<void> {
    await this.logMessage({
      session_id: sessionId,
      direction: 'incoming',
      content,
      content_type: contentType,
      chatwoot_message_id: chatwootMessageId,
      attachments,
    });
  }

  static async logOutgoingMessage(
    sessionId: number,
    content: string | null,
    contentType: string,
    whatsappMessageId?: string,
    typebotResponse?: any
  ): Promise<void> {
    await this.logMessage({
      session_id: sessionId,
      direction: 'outgoing',
      content,
      content_type: contentType,
      whatsapp_message_id: whatsappMessageId,
      typebot_response: typebotResponse,
    });
  }
}

