import { db } from '../config/database';

export interface Inbox {
  id: number;
  tenant_id: number;
  inbox_id: number;
  inbox_name: string | null;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_api_version: string;
  typebot_base_url: string;
  typebot_api_key: string | null;
  typebot_public_id: string;
  chatwoot_api_token: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInboxData {
  tenant_id: number;
  inbox_id: number;
  inbox_name?: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_api_version?: string;
  typebot_base_url: string;
  typebot_api_key?: string;
  typebot_public_id: string;
  chatwoot_api_token?: string;
  is_active?: boolean;
}

export class InboxModel {
  static async findAll(): Promise<Inbox[]> {
    const result = await db.query('SELECT * FROM inboxes ORDER BY id');
    return result.rows;
  }

  static async findByTenantId(tenantId: number): Promise<Inbox[]> {
    const result = await db.query(
      'SELECT * FROM inboxes WHERE tenant_id = $1 ORDER BY id',
      [tenantId]
    );
    return result.rows;
  }

  static async findById(id: number): Promise<Inbox | null> {
    const result = await db.query('SELECT * FROM inboxes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByInboxId(
    tenantId: number,
    inboxId: number
  ): Promise<Inbox | null> {
    const result = await db.query(
      'SELECT * FROM inboxes WHERE tenant_id = $1 AND inbox_id = $2',
      [tenantId, inboxId]
    );
    return result.rows[0] || null;
  }

  static async findByChatwootInboxId(inboxId: number): Promise<Inbox | null> {
    const result = await db.query(
      'SELECT * FROM inboxes WHERE inbox_id = $1 AND is_active = TRUE',
      [inboxId]
    );
    return result.rows[0] || null;
  }

  static async create(data: CreateInboxData): Promise<Inbox> {
    const result = await db.query(
      `INSERT INTO inboxes (
        tenant_id, inbox_id, inbox_name, whatsapp_phone_number_id,
        whatsapp_access_token, whatsapp_api_version, typebot_base_url,
        typebot_api_key, typebot_public_id, chatwoot_api_token, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.tenant_id,
        data.inbox_id,
        data.inbox_name || null,
        data.whatsapp_phone_number_id,
        data.whatsapp_access_token,
        data.whatsapp_api_version || 'v21.0',
        data.typebot_base_url,
        data.typebot_api_key || null,
        data.typebot_public_id,
        data.chatwoot_api_token || null,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );
    return result.rows[0];
  }

  static async update(
    id: number,
    data: Partial<CreateInboxData>
  ): Promise<Inbox> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.inbox_name !== undefined) {
      fields.push(`inbox_name = $${paramCount++}`);
      values.push(data.inbox_name || null);
    }
    if (data.whatsapp_phone_number_id) {
      fields.push(`whatsapp_phone_number_id = $${paramCount++}`);
      values.push(data.whatsapp_phone_number_id);
    }
    if (data.whatsapp_access_token) {
      fields.push(`whatsapp_access_token = $${paramCount++}`);
      values.push(data.whatsapp_access_token);
    }
    if (data.whatsapp_api_version) {
      fields.push(`whatsapp_api_version = $${paramCount++}`);
      values.push(data.whatsapp_api_version);
    }
    if (data.typebot_base_url) {
      fields.push(`typebot_base_url = $${paramCount++}`);
      values.push(data.typebot_base_url);
    }
    if (data.typebot_api_key !== undefined) {
      fields.push(`typebot_api_key = $${paramCount++}`);
      values.push(data.typebot_api_key || null);
    }
    if (data.typebot_public_id) {
      fields.push(`typebot_public_id = $${paramCount++}`);
      values.push(data.typebot_public_id);
    }
    if (data.chatwoot_api_token !== undefined) {
      fields.push(`chatwoot_api_token = $${paramCount++}`);
      values.push(data.chatwoot_api_token || null);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE inboxes SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM inboxes WHERE id = $1', [id]);
  }
}

