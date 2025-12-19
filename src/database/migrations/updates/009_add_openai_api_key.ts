export const up = `
  -- Adiciona openai_api_key na tabela tenants (se não existir)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'openai_api_key'
    ) THEN
      ALTER TABLE tenants ADD COLUMN openai_api_key VARCHAR(500);
    END IF;
  END $$;
`;

export const down = `
  ALTER TABLE tenants DROP COLUMN IF EXISTS openai_api_key;
`;
