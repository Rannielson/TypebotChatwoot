import { db } from '../config/database';
import { Trigger, CreateTriggerData, UpdateTriggerData, InboxTrigger } from '../types/trigger';

export class TriggerModel {
  static async findAll(): Promise<Trigger[]> {
    const result = await db.query('SELECT * FROM triggers ORDER BY created_at DESC');
    return result.rows;
  }

  static async findById(id: number): Promise<Trigger | null> {
    const result = await db.query('SELECT * FROM triggers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByName(name: string): Promise<Trigger | null> {
    const result = await db.query('SELECT * FROM triggers WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  static async findActive(): Promise<Trigger[]> {
    const result = await db.query(
      'SELECT * FROM triggers WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async create(data: CreateTriggerData): Promise<Trigger> {
    const result = await db.query(
      `INSERT INTO triggers (
        name, description, is_active, action_type, idle_minutes,
        check_frequency_minutes, requires_no_assignee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.name,
        data.description || null,
        data.is_active !== undefined ? data.is_active : true,
        data.action_type || 'check_idle_conversations',
        data.idle_minutes,
        data.check_frequency_minutes,
        data.requires_no_assignee !== undefined ? data.requires_no_assignee : true,
      ]
    );
    return result.rows[0];
  }

  static async update(id: number, data: UpdateTriggerData): Promise<Trigger> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description || null);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }
    if (data.action_type !== undefined) {
      fields.push(`action_type = $${paramCount++}`);
      values.push(data.action_type);
    }
    if (data.idle_minutes !== undefined) {
      fields.push(`idle_minutes = $${paramCount++}`);
      values.push(data.idle_minutes);
    }
    if (data.check_frequency_minutes !== undefined) {
      fields.push(`check_frequency_minutes = $${paramCount++}`);
      values.push(data.check_frequency_minutes);
    }
    if (data.requires_no_assignee !== undefined) {
      fields.push(`requires_no_assignee = $${paramCount++}`);
      values.push(data.requires_no_assignee);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE triggers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM triggers WHERE id = $1', [id]);
  }

  // Relacionamento com inboxes
  static async attachToInbox(triggerId: number, inboxId: number): Promise<InboxTrigger> {
    const result = await db.query(
      `INSERT INTO inbox_triggers (inbox_id, trigger_id)
       VALUES ($1, $2)
       ON CONFLICT (inbox_id, trigger_id) DO NOTHING
       RETURNING *`,
      [inboxId, triggerId]
    );
    return result.rows[0];
  }

  static async detachFromInbox(triggerId: number, inboxId: number): Promise<void> {
    await db.query(
      'DELETE FROM inbox_triggers WHERE inbox_id = $1 AND trigger_id = $2',
      [inboxId, triggerId]
    );
  }

  static async findByInboxId(inboxId: number): Promise<Trigger[]> {
    const result = await db.query(
      `SELECT t.* FROM triggers t
       INNER JOIN inbox_triggers it ON t.id = it.trigger_id
       WHERE it.inbox_id = $1
       ORDER BY t.created_at DESC`,
      [inboxId]
    );
    return result.rows;
  }

  static async findActiveByInboxId(inboxId: number): Promise<Trigger[]> {
    const result = await db.query(
      `SELECT t.* FROM triggers t
       INNER JOIN inbox_triggers it ON t.id = it.trigger_id
       WHERE it.inbox_id = $1 AND t.is_active = TRUE
       ORDER BY t.created_at DESC`,
      [inboxId]
    );
    return result.rows;
  }

  static async getInboxIdsForTrigger(triggerId: number): Promise<number[]> {
    const result = await db.query(
      'SELECT inbox_id FROM inbox_triggers WHERE trigger_id = $1',
      [triggerId]
    );
    return result.rows.map((row: any) => row.inbox_id);
  }

  /**
   * OTIMIZADO: Busca inbox_ids de múltiplos triggers de uma vez (batch query)
   * Retorna um Map<triggerId, inboxIds[]>
   * Reduz N queries para 1 query única
   */
  static async getInboxIdsForTriggersBatch(triggerIds: number[]): Promise<Map<number, number[]>> {
    if (triggerIds.length === 0) {
      return new Map();
    }

    const result = await db.query(
      'SELECT trigger_id, inbox_id FROM inbox_triggers WHERE trigger_id = ANY($1::int[])',
      [triggerIds]
    );
    
    const map = new Map<number, number[]>();
    for (const row of result.rows) {
      const triggerId = row.trigger_id;
      const inboxId = row.inbox_id;
      
      if (!map.has(triggerId)) {
        map.set(triggerId, []);
      }
      map.get(triggerId)!.push(inboxId);
    }
    
    return map;
  }
}
