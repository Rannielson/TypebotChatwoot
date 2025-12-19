export const up = `
  -- Adiciona contact_name na tabela sessions_history (se não existir)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sessions_history' AND column_name = 'contact_name'
    ) THEN
      ALTER TABLE sessions_history ADD COLUMN contact_name VARCHAR(255);
    END IF;
  END $$;

  -- Adiciona status 'paused' ao CHECK constraint
  DO $$ 
  BEGIN
    -- Remove o constraint antigo
    ALTER TABLE sessions_history DROP CONSTRAINT IF EXISTS sessions_history_status_check;
    
    -- Adiciona o novo constraint com 'paused'
    ALTER TABLE sessions_history ADD CONSTRAINT sessions_history_status_check 
      CHECK (status IN ('active', 'closed', 'expired', 'paused'));
  END $$;
`;

export const down = `
  ALTER TABLE sessions_history DROP COLUMN IF EXISTS contact_name;
  
  -- Reverter para constraint original sem 'paused'
  ALTER TABLE sessions_history DROP CONSTRAINT IF EXISTS sessions_history_status_check;
  ALTER TABLE sessions_history ADD CONSTRAINT sessions_history_status_check 
    CHECK (status IN ('active', 'closed', 'expired'));
`;
