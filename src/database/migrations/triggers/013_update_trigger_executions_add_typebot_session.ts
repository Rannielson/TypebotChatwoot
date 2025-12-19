export const up = `
  -- Atualiza tabela trigger_executions para incluir typebot_session_id na constraint UNIQUE
  -- Isso permite que diferentes triggers executem na mesma conversa
  -- E que o mesmo trigger execute novamente se a sessão do Typebot mudar

  -- 1. Adiciona coluna typebot_session_id se não existir
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'trigger_executions' AND column_name = 'typebot_session_id'
    ) THEN
      -- Adiciona coluna como nullable primeiro (para dados existentes)
      ALTER TABLE trigger_executions ADD COLUMN typebot_session_id VARCHAR(255);
      
      -- Preenche com valor padrão para registros existentes (se houver)
      -- Usa um valor único baseado no session_id para manter a unicidade
      UPDATE trigger_executions 
      SET typebot_session_id = COALESCE(
        (SELECT typebot_session_id FROM sessions_history WHERE id = trigger_executions.session_id),
        'legacy_' || trigger_executions.id::text
      )
      WHERE typebot_session_id IS NULL;
      
      -- Agora torna NOT NULL
      ALTER TABLE trigger_executions ALTER COLUMN typebot_session_id SET NOT NULL;
    END IF;
  END $$;

  -- 2. Remove constraint UNIQUE antiga se existir
  DO $$
  BEGIN
    -- Verifica se existe constraint UNIQUE antiga (conversation_id, trigger_id)
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'trigger_executions_conversation_id_trigger_id_key'
    ) THEN
      ALTER TABLE trigger_executions 
      DROP CONSTRAINT trigger_executions_conversation_id_trigger_id_key;
    END IF;
  END $$;

  -- 3. Adiciona nova constraint UNIQUE (conversation_id, trigger_id, typebot_session_id)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'trigger_executions_conversation_id_trigger_id_typebot_session_id_key'
    ) THEN
      ALTER TABLE trigger_executions 
      ADD CONSTRAINT trigger_executions_conversation_id_trigger_id_typebot_session_id_key 
      UNIQUE (conversation_id, trigger_id, typebot_session_id);
    END IF;
  END $$;

  -- 4. Adiciona índice para typebot_session_id se não existir
  CREATE INDEX IF NOT EXISTS idx_trigger_executions_typebot_session 
  ON trigger_executions(typebot_session_id);
`;

export const down = `
  -- Remove índice
  DROP INDEX IF EXISTS idx_trigger_executions_typebot_session;
  
  -- Remove constraint UNIQUE nova
  ALTER TABLE trigger_executions 
  DROP CONSTRAINT IF EXISTS trigger_executions_conversation_id_trigger_id_typebot_session_id_key;
  
  -- Restaura constraint UNIQUE antiga
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'trigger_executions_conversation_id_trigger_id_key'
    ) THEN
      ALTER TABLE trigger_executions 
      ADD CONSTRAINT trigger_executions_conversation_id_trigger_id_key 
      UNIQUE (conversation_id, trigger_id);
    END IF;
  END $$;
  
  -- Remove coluna typebot_session_id
  ALTER TABLE trigger_executions DROP COLUMN IF EXISTS typebot_session_id;
`;
