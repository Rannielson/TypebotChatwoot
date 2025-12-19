export const up = `
  -- Cria tabela triggers
  CREATE TABLE IF NOT EXISTS triggers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    action_type VARCHAR(50) DEFAULT 'check_idle_conversations',
    idle_minutes INTEGER NOT NULL CHECK (idle_minutes > 0),
    check_frequency_minutes INTEGER NOT NULL CHECK (check_frequency_minutes >= 3),
    requires_no_assignee BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Cria tabela inbox_triggers (relacionamento many-to-many)
  CREATE TABLE IF NOT EXISTS inbox_triggers (
    id SERIAL PRIMARY KEY,
    inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    trigger_id INTEGER NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(inbox_id, trigger_id)
  );

  -- Adiciona índices para performance
  CREATE INDEX IF NOT EXISTS idx_inbox_triggers_inbox_id ON inbox_triggers(inbox_id);
  CREATE INDEX IF NOT EXISTS idx_inbox_triggers_trigger_id ON inbox_triggers(trigger_id);
  CREATE INDEX IF NOT EXISTS idx_triggers_is_active ON triggers(is_active);

  -- Adiciona campos de rastreamento de trigger na tabela sessions_history
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sessions_history' AND column_name = 'last_trigger_command'
    ) THEN
      ALTER TABLE sessions_history ADD COLUMN last_trigger_command VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sessions_history' AND column_name = 'last_triggered_at'
    ) THEN
      ALTER TABLE sessions_history ADD COLUMN last_triggered_at TIMESTAMP;
    END IF;
  END $$;

  -- Cria índice para busca por último comando
  CREATE INDEX IF NOT EXISTS idx_sessions_last_trigger_command ON sessions_history(last_trigger_command);
  CREATE INDEX IF NOT EXISTS idx_sessions_last_triggered_at ON sessions_history(last_triggered_at);
`;

export const down = `
  DROP INDEX IF EXISTS idx_sessions_last_triggered_at;
  DROP INDEX IF EXISTS idx_sessions_last_trigger_command;
  DROP INDEX IF EXISTS idx_triggers_is_active;
  DROP INDEX IF EXISTS idx_inbox_triggers_trigger_id;
  DROP INDEX IF EXISTS idx_inbox_triggers_inbox_id;
  
  ALTER TABLE sessions_history DROP COLUMN IF EXISTS last_triggered_at;
  ALTER TABLE sessions_history DROP COLUMN IF EXISTS last_trigger_command;
  
  DROP TABLE IF EXISTS inbox_triggers;
  DROP TABLE IF EXISTS triggers;
`;
