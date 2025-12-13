export const up = `
  -- Adiciona chatwoot_account_id na tabela tenants (se não existir)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'chatwoot_account_id'
    ) THEN
      ALTER TABLE tenants ADD COLUMN chatwoot_account_id INTEGER;
    END IF;
  END $$;

  -- Adiciona chatwoot_api_token na tabela inboxes (se não existir)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inboxes' AND column_name = 'chatwoot_api_token'
    ) THEN
      ALTER TABLE inboxes ADD COLUMN chatwoot_api_token VARCHAR(500);
    END IF;
  END $$;
`;

export const down = `
  ALTER TABLE tenants DROP COLUMN IF EXISTS chatwoot_account_id;
  ALTER TABLE inboxes DROP COLUMN IF EXISTS chatwoot_api_token;
`;

