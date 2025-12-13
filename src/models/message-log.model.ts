import { db } from '../config/database';

export interface MessageLog {
  id: number;
  session_id: number;
  direction: 'incoming' | 'outgoing';
  content: string | null;
  content_type: string;
  attachments: any | null;
  chatwoot_message_id: string | null;
  whatsapp_message_id: string | null;
  typebot_response: any | null;
  created_at: Date;
}

export interface CreateMessageLogData {
  session_id: number;
  direction: 'incoming' | 'outgoing';
  content?: string | null;
  content_type?: string;
  attachments?: any;
  chatwoot_message_id?: string;
  whatsapp_message_id?: string;
  typebot_response?: any;
}

export class MessageLogModel {
  static async create(data: CreateMessageLogData): Promise<MessageLog> {
    const result = await db.query(
      `INSERT INTO message_logs (
        session_id, direction, content, content_type,
        attachments, chatwoot_message_id, whatsapp_message_id, typebot_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.session_id,
        data.direction,
        data.content || null,
        data.content_type || 'text',
        data.attachments ? JSON.stringify(data.attachments) : null,
        data.chatwoot_message_id || null,
        data.whatsapp_message_id || null,
        data.typebot_response ? JSON.stringify(data.typebot_response) : null,
      ]
    );
    return result.rows[0];
  }

  static async findBySessionId(sessionId: number): Promise<MessageLog[]> {
    const result = await db.query(
      'SELECT * FROM message_logs WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    return result.rows;
  }
}

