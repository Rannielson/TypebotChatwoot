import { db } from '../config/database';

export interface Tenant {
  id: number;
  name: string;
  chatwoot_url: string | null;
  chatwoot_token: string | null;
  chatwoot_account_id: number | null;
  openai_api_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTenantData {
  name: string;
  chatwoot_url?: string;
  chatwoot_token?: string;
  chatwoot_account_id?: number;
  openai_api_key?: string;
}

export class TenantModel {
  static async findAll(): Promise<Tenant[]> {
    const result = await db.query('SELECT * FROM tenants ORDER BY id');
    return result.rows;
  }

  static async findById(id: number): Promise<Tenant | null> {
    const result = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data: CreateTenantData): Promise<Tenant> {
    const result = await db.query(
      'INSERT INTO tenants (name, chatwoot_url, chatwoot_token, chatwoot_account_id, openai_api_key) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        data.name,
        data.chatwoot_url || null,
        data.chatwoot_token || null,
        data.chatwoot_account_id || null,
        data.openai_api_key || null,
      ]
    );
    return result.rows[0];
  }

  static async update(
    id: number,
    data: Partial<CreateTenantData>
  ): Promise<Tenant> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.chatwoot_url !== undefined) {
      fields.push(`chatwoot_url = $${paramCount++}`);
      values.push(data.chatwoot_url || null);
    }
    if (data.chatwoot_token !== undefined) {
      fields.push(`chatwoot_token = $${paramCount++}`);
      values.push(data.chatwoot_token || null);
    }
    if (data.chatwoot_account_id !== undefined) {
      fields.push(`chatwoot_account_id = $${paramCount++}`);
      values.push(data.chatwoot_account_id || null);
    }
    if (data.openai_api_key !== undefined) {
      fields.push(`openai_api_key = $${paramCount++}`);
      values.push(data.openai_api_key || null);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM tenants WHERE id = $1', [id]);
  }
}

