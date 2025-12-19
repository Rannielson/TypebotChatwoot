export const up = `
  -- Adiciona is_test_mode e test_phone_number na tabela inboxes (se não existirem)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inboxes' AND column_name = 'is_test_mode'
    ) THEN
      ALTER TABLE inboxes ADD COLUMN is_test_mode BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inboxes' AND column_name = 'test_phone_number'
    ) THEN
      ALTER TABLE inboxes ADD COLUMN test_phone_number VARCHAR(20);
    END IF;
  END $$;
`;

export const down = `
  ALTER TABLE inboxes DROP COLUMN IF EXISTS is_test_mode;
  ALTER TABLE inboxes DROP COLUMN IF EXISTS test_phone_number;
`;
