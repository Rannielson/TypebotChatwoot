export const up = `
  -- Cria tabela para rastrear execuções de triggers por conversa e sessão Typebot
  -- Garante que cada trigger execute apenas UMA VEZ por combinação: conversa + trigger + sessão Typebot
  -- Isso permite que diferentes triggers executem na mesma conversa
  -- E que o mesmo trigger execute novamente se a sessão do Typebot mudar
  CREATE TABLE IF NOT EXISTS trigger_executions (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    trigger_id INTEGER NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
    typebot_session_id VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id INTEGER REFERENCES sessions_history(id) ON DELETE SET NULL,
    UNIQUE(conversation_id, trigger_id, typebot_session_id)
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_trigger_executions_conversation ON trigger_executions(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger ON trigger_executions(trigger_id);
  CREATE INDEX IF NOT EXISTS idx_trigger_executions_typebot_session ON trigger_executions(typebot_session_id);
  CREATE INDEX IF NOT EXISTS idx_trigger_executions_executed_at ON trigger_executions(executed_at);
`;

export const down = `
  DROP INDEX IF EXISTS idx_trigger_executions_executed_at;
  DROP INDEX IF EXISTS idx_trigger_executions_trigger;
  DROP INDEX IF EXISTS idx_trigger_executions_conversation;
  DROP TABLE IF EXISTS trigger_executions;
`;
