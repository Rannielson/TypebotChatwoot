import { db } from '../config/database';

export interface TriggerExecution {
  id: number;
  conversation_id: number;
  trigger_id: number;
  typebot_session_id: string;
  executed_at: Date;
  session_id: number | null;
}

export interface CreateTriggerExecutionData {
  conversation_id: number;
  trigger_id: number;
  typebot_session_id: string;
  session_id?: number | null;
}

export class TriggerExecutionModel {
  /**
   * Verifica se um trigger já foi executado para uma combinação específica:
   * conversa + trigger + sessão Typebot
   * 
   * Isso permite que:
   * - Diferentes triggers executem na mesma conversa
   * - O mesmo trigger execute novamente se a sessão do Typebot mudar
   */
  static async hasBeenExecuted(
    conversationId: number,
    triggerId: number,
    typebotSessionId: string
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT id FROM trigger_executions 
       WHERE conversation_id = $1 AND trigger_id = $2 AND typebot_session_id = $3`,
      [conversationId, triggerId, typebotSessionId]
    );
    return result.rows.length > 0;
  }

  /**
   * Tenta registrar a execução ANTES de executar (try-lock pattern)
   * Retorna o registro se foi criado com sucesso, ou null se já existe
   * Isso garante execução única mesmo em race conditions
   */
  static async tryCreate(data: CreateTriggerExecutionData): Promise<TriggerExecution | null> {
    const result = await db.query(
      `INSERT INTO trigger_executions (conversation_id, trigger_id, typebot_session_id, session_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (conversation_id, trigger_id, typebot_session_id) DO NOTHING
       RETURNING *`,
      [
        data.conversation_id,
        data.trigger_id,
        data.typebot_session_id,
        data.session_id || null
      ]
    );
    
    // Se não retornou nada, significa que já existe (CONFLICT)
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  /**
   * Registra a execução de um trigger para uma combinação específica:
   * conversa + trigger + sessão Typebot
   * (Mantido para compatibilidade, mas use tryCreate para evitar race conditions)
   */
  static async create(data: CreateTriggerExecutionData): Promise<TriggerExecution> {
    const result = await db.query(
      `INSERT INTO trigger_executions (conversation_id, trigger_id, typebot_session_id, session_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (conversation_id, trigger_id, typebot_session_id) DO NOTHING
       RETURNING *`,
      [
        data.conversation_id,
        data.trigger_id,
        data.typebot_session_id,
        data.session_id || null
      ]
    );
    
    if (result.rows.length === 0) {
      // Já existe, busca o registro existente
      const existing = await db.query(
        `SELECT * FROM trigger_executions 
         WHERE conversation_id = $1 AND trigger_id = $2 AND typebot_session_id = $3`,
        [data.conversation_id, data.trigger_id, data.typebot_session_id]
      );
      return existing.rows[0];
    }
    
    return result.rows[0];
  }

  /**
   * Busca execuções de um trigger
   */
  static async findByTriggerId(triggerId: number): Promise<TriggerExecution[]> {
    const result = await db.query(
      'SELECT * FROM trigger_executions WHERE trigger_id = $1 ORDER BY executed_at DESC',
      [triggerId]
    );
    return result.rows;
  }

  /**
   * Busca execuções de uma conversa
   */
  static async findByConversationId(conversationId: number): Promise<TriggerExecution[]> {
    const result = await db.query(
      'SELECT * FROM trigger_executions WHERE conversation_id = $1 ORDER BY executed_at DESC',
      [conversationId]
    );
    return result.rows;
  }

  /**
   * Remove execução (útil para testes ou reset)
   */
  static async delete(
    conversationId: number,
    triggerId: number,
    typebotSessionId: string
  ): Promise<void> {
    await db.query(
      `DELETE FROM trigger_executions 
       WHERE conversation_id = $1 AND trigger_id = $2 AND typebot_session_id = $3`,
      [conversationId, triggerId, typebotSessionId]
    );
  }
}
