import { db } from '../config/database';

export interface SessionHistory {
  id: number;
  tenant_id: number;
  inbox_id: number;
  conversation_id: number;
  phone_number: string;
  contact_name: string | null;
  typebot_session_id: string;
  typebot_result_id: string | null;
  typebot_public_id: string;
  status: 'active' | 'closed' | 'expired' | 'paused';
  last_trigger_command: string | null;
  last_triggered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export interface CreateSessionData {
  tenant_id: number;
  inbox_id: number;
  conversation_id: number;
  phone_number: string;
  contact_name?: string;
  typebot_session_id: string;
  typebot_result_id?: string;
  typebot_public_id: string;
  status?: 'active' | 'closed' | 'expired' | 'paused';
  last_trigger_command?: string | null;
  last_triggered_at?: Date | null;
}

export class SessionModel {
  static async findActive(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<SessionHistory | null> {
    const result = await db.query(
      `SELECT * FROM sessions_history 
       WHERE tenant_id = $1 AND inbox_id = $2 
       AND conversation_id = $3 AND phone_number = $4 
       AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, inboxId, conversationId, phoneNumber]
    );
    return result.rows[0] || null;
  }

  static async findByStatus(
    tenantId: number,
    inboxId: number,
    conversationId: number,
    phoneNumber: string,
    status: 'active' | 'paused' | 'closed' | 'expired'
  ): Promise<SessionHistory | null> {
    const result = await db.query(
      `SELECT * FROM sessions_history 
       WHERE tenant_id = $1 AND inbox_id = $2 
       AND conversation_id = $3 AND phone_number = $4 
       AND status = $5
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, inboxId, conversationId, phoneNumber, status]
    );
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<SessionHistory | null> {
    const result = await db.query(
      'SELECT * FROM sessions_history WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByTypebotSessionId(
    typebotSessionId: string
  ): Promise<SessionHistory | null> {
    const result = await db.query(
      'SELECT * FROM sessions_history WHERE typebot_session_id = $1',
      [typebotSessionId]
    );
    return result.rows[0] || null;
  }

  static async findActiveByInboxAndConversation(
    inboxId: number,
    conversationId: number,
    phoneNumber: string
  ): Promise<SessionHistory | null> {
    const result = await db.query(
      `SELECT * FROM sessions_history 
       WHERE inbox_id = $1 
       AND conversation_id = $2 
       AND phone_number = $3 
       AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [inboxId, conversationId, phoneNumber]
    );
    return result.rows[0] || null;
  }

  static async findByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<SessionHistory[]> {
    const result = await db.query(
      `SELECT * FROM sessions_history 
       WHERE tenant_id = $1 AND inbox_id = $2 AND conversation_id = $3
       ORDER BY created_at DESC`,
      [tenantId, inboxId, conversationId]
    );
    return result.rows;
  }

  static async create(data: CreateSessionData): Promise<SessionHistory> {
    const result = await db.query(
      `INSERT INTO sessions_history (
        tenant_id, inbox_id, conversation_id, phone_number, contact_name,
        typebot_session_id, typebot_result_id, typebot_public_id, status,
        last_trigger_command, last_triggered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (tenant_id, inbox_id, conversation_id, phone_number, typebot_session_id)
      DO UPDATE SET 
        updated_at = CURRENT_TIMESTAMP,
        typebot_result_id = EXCLUDED.typebot_result_id,
        status = EXCLUDED.status,
        contact_name = COALESCE(EXCLUDED.contact_name, sessions_history.contact_name),
        last_trigger_command = COALESCE(EXCLUDED.last_trigger_command, sessions_history.last_trigger_command),
        last_triggered_at = COALESCE(EXCLUDED.last_triggered_at, sessions_history.last_triggered_at)
      RETURNING *`,
      [
        data.tenant_id,
        data.inbox_id,
        data.conversation_id,
        data.phone_number,
        data.contact_name || null,
        data.typebot_session_id,
        data.typebot_result_id || null,
        data.typebot_public_id,
        data.status || 'active',
        data.last_trigger_command || null,
        data.last_triggered_at || null,
      ]
    );
    return result.rows[0];
  }

  static async update(
    id: number,
    data: Partial<CreateSessionData & { status: 'active' | 'closed' | 'expired' | 'paused'; tenant_id?: number }>
  ): Promise<SessionHistory> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.typebot_result_id !== undefined) {
      fields.push(`typebot_result_id = $${paramCount++}`);
      values.push(data.typebot_result_id || null);
    }
    if (data.contact_name !== undefined) {
      fields.push(`contact_name = $${paramCount++}`);
      values.push(data.contact_name || null);
    }
    if (data.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
      if (data.status === 'closed') {
        fields.push(`closed_at = CURRENT_TIMESTAMP`);
      }
    }
    if (data.tenant_id !== undefined) {
      fields.push(`tenant_id = $${paramCount++}`);
      values.push(data.tenant_id);
    }
    if (data.last_trigger_command !== undefined) {
      fields.push(`last_trigger_command = $${paramCount++}`);
      values.push(data.last_trigger_command || null);
    }
    if (data.last_triggered_at !== undefined) {
      fields.push(`last_triggered_at = $${paramCount++}`);
      values.push(data.last_triggered_at || null);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE sessions_history SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async closeByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<number> {
    const result = await db.query(
      `UPDATE sessions_history 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND inbox_id = $2 AND conversation_id = $3 AND status IN ('active', 'paused')
       RETURNING id`,
      [tenantId, inboxId, conversationId]
    );
    return result.rowCount || 0;
  }

  static async findAllActive(inboxId?: number): Promise<SessionHistory[]> {
    if (inboxId) {
      const result = await db.query(
        `SELECT s.*, i.inbox_name 
         FROM sessions_history s
         LEFT JOIN inboxes i ON s.inbox_id = i.id
         WHERE s.status = 'active' AND s.inbox_id = $1
         ORDER BY s.created_at DESC`,
        [inboxId]
      );
      return result.rows;
    } else {
      const result = await db.query(
        `SELECT s.*, i.inbox_name 
         FROM sessions_history s
         LEFT JOIN inboxes i ON s.inbox_id = i.id
         WHERE s.status = 'active'
         ORDER BY s.created_at DESC`
      );
      return result.rows;
    }
  }

  static async countActive(inboxId?: number): Promise<number> {
    if (inboxId) {
      const result = await db.query(
        `SELECT COUNT(*) as count 
         FROM sessions_history 
         WHERE status = 'active' AND inbox_id = $1`,
        [inboxId]
      );
      return parseInt(result.rows[0].count);
    } else {
      const result = await db.query(
        `SELECT COUNT(*) as count 
         FROM sessions_history 
         WHERE status = 'active'`
      );
      return parseInt(result.rows[0].count);
    }
  }

  /**
   * Busca sessões com filtros opcionais de status, tenant_id e inbox_id
   */
  static async findAllWithFilters(
    filters: {
      status?: 'active' | 'paused' | 'closed' | 'expired';
      tenantId?: number;
      inboxId?: number;
    } = {}
  ): Promise<SessionHistory[]> {
    const { status, tenantId, inboxId } = filters;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`s.status = $${paramCount++}`);
      values.push(status);
    }

    if (tenantId) {
      conditions.push(`s.tenant_id = $${paramCount++}`);
      values.push(tenantId);
    }

    if (inboxId) {
      conditions.push(`s.inbox_id = $${paramCount++}`);
      values.push(inboxId);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT s.*, i.inbox_name 
      FROM sessions_history s
      LEFT JOIN inboxes i ON s.inbox_id = i.id
      ${whereClause}
      ORDER BY s.created_at DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Conta sessões com filtros opcionais
   */
  static async countWithFilters(
    filters: {
      status?: 'active' | 'paused' | 'closed' | 'expired';
      tenantId?: number;
      inboxId?: number;
    } = {}
  ): Promise<number> {
    const { status, tenantId, inboxId } = filters;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (tenantId) {
      conditions.push(`tenant_id = $${paramCount++}`);
      values.push(tenantId);
    }

    if (inboxId) {
      conditions.push(`inbox_id = $${paramCount++}`);
      values.push(inboxId);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `SELECT COUNT(*) as count FROM sessions_history ${whereClause}`;
    const result = await db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  static async pause(id: number): Promise<SessionHistory> {
    const result = await db.query(
      `UPDATE sessions_history 
       SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Sessão não encontrada ou já não está ativa');
    }
    return result.rows[0];
  }

  static async pauseByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<number> {
    const result = await db.query(
      `UPDATE sessions_history 
       SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND inbox_id = $2 AND conversation_id = $3 AND status = 'active'
       RETURNING id`,
      [tenantId, inboxId, conversationId]
    );
    return result.rowCount || 0;
  }

  /**
   * Retoma (ativa) todas as sessões pausadas de uma conversa.
   * 
   * @param tenantId ID do tenant
   * @param inboxId ID interno do inbox
   * @param conversationId ID da conversa no Chatwoot
   * @returns Número de sessões retomadas
   */
  static async resumeByConversation(
    tenantId: number,
    inboxId: number,
    conversationId: number
  ): Promise<number> {
    const result = await db.query(
      `UPDATE sessions_history 
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND inbox_id = $2 AND conversation_id = $3 AND status = 'paused'
       RETURNING id`,
      [tenantId, inboxId, conversationId]
    );
    return result.rowCount || 0;
  }

  static async close(id: number): Promise<SessionHistory> {
    const result = await db.query(
      `UPDATE sessions_history 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('active', 'paused')
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Sessão não encontrada ou já está fechada');
    }
    return result.rows[0];
  }

  /**
   * Busca sessões com filtros de status e tempo (horas desde criação)
   * @param filters Filtros para buscar sessões
   * @returns Array de sessões que atendem aos critérios
   */
  static async findWithTimeFilter(
    filters: {
      inboxId: number;
      status?: 'active' | 'paused' | 'closed' | 'expired';
      olderThanHours?: number; // Sessões criadas há mais de X horas
    }
  ): Promise<SessionHistory[]> {
    const { inboxId, status, olderThanHours } = filters;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Filtro obrigatório: inbox_id
    conditions.push(`s.inbox_id = $${paramCount++}`);
    values.push(inboxId);

    // Filtro de status
    if (status) {
      conditions.push(`s.status = $${paramCount++}`);
      values.push(status);
    } else {
      // Se não especificar status, busca apenas active e paused (sessões que podem ser encerradas)
      conditions.push(`s.status IN ($${paramCount}, $${paramCount + 1})`);
      values.push('active', 'paused');
      paramCount += 2;
    }

    // Filtro de tempo (sessões criadas há mais de X horas)
    if (olderThanHours && olderThanHours > 0) {
      conditions.push(
        `s.created_at < NOW() - INTERVAL '${olderThanHours} hours'`
      );
    }

    const query = `
      SELECT s.*, i.inbox_name 
      FROM sessions_history s
      LEFT JOIN inboxes i ON s.inbox_id = i.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.created_at DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Encerra sessões em massa com base em filtros
   * @param filters Filtros para encerrar sessões
   * @returns Número de sessões encerradas
   */
  static async closeBulk(
    filters: {
      inboxId: number;
      status?: 'active' | 'paused' | 'closed' | 'expired';
      olderThanHours?: number; // Sessões criadas há mais de X horas
    }
  ): Promise<number> {
    const { inboxId, status, olderThanHours } = filters;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Filtro obrigatório: inbox_id
    conditions.push(`inbox_id = $${paramCount++}`);
    values.push(inboxId);

    // Filtro de status - só encerra active e paused
    if (status && ['active', 'paused'].includes(status)) {
      conditions.push(`status = $${paramCount++}`);
      values.push(status);
    } else {
      // Se não especificar ou especificar outro status, encerra apenas active e paused
      conditions.push(`status IN ($${paramCount}, $${paramCount + 1})`);
      values.push('active', 'paused');
      paramCount += 2;
    }

    // Filtro de tempo (sessões criadas há mais de X horas)
    if (olderThanHours && olderThanHours > 0) {
      conditions.push(
        `created_at < NOW() - INTERVAL '${olderThanHours} hours'`
      );
    }

    const query = `
      UPDATE sessions_history 
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE ${conditions.join(' AND ')}
      RETURNING id
    `;

    const result = await db.query(query, values);
    return result.rowCount || 0;
  }
}

