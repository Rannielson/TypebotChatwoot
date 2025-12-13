import { db } from '../config/database';

export interface ButtonMapping {
  id: number;
  session_id: number;
  button_title: string;
  outgoing_edge_id: string;
  created_at: Date;
}

export interface CreateButtonMappingData {
  session_id: number;
  button_title: string;
  outgoing_edge_id: string;
}

export class ButtonMappingModel {
  static async create(data: CreateButtonMappingData): Promise<ButtonMapping> {
    const result = await db.query(
      `INSERT INTO button_mappings (session_id, button_title, outgoing_edge_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, button_title)
       DO UPDATE SET outgoing_edge_id = EXCLUDED.outgoing_edge_id
       RETURNING *`,
      [data.session_id, data.button_title, data.outgoing_edge_id]
    );
    return result.rows[0];
  }

  static async findBySessionId(
    sessionId: number
  ): Promise<ButtonMapping[]> {
    const result = await db.query(
      'SELECT * FROM button_mappings WHERE session_id = $1',
      [sessionId]
    );
    return result.rows;
  }

  static async findByTitle(
    sessionId: number,
    buttonTitle: string
  ): Promise<ButtonMapping | null> {
    const result = await db.query(
      'SELECT * FROM button_mappings WHERE session_id = $1 AND button_title = $2',
      [sessionId, buttonTitle]
    );
    return result.rows[0] || null;
  }

  static async deleteBySessionId(sessionId: number): Promise<void> {
    await db.query('DELETE FROM button_mappings WHERE session_id = $1', [
      sessionId,
    ]);
  }
}

