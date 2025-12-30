export const up = `
  -- Adiciona auto_close_minutes na tabela inboxes (se não existir)
  -- NULL = não encerra automaticamente, valor em minutos = tempo para encerrar sessões inativas
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inboxes' AND column_name = 'auto_close_minutes'
    ) THEN
      ALTER TABLE inboxes ADD COLUMN auto_close_minutes INTEGER;
      COMMENT ON COLUMN inboxes.auto_close_minutes IS 'Tempo em minutos para encerrar automaticamente sessões inativas. NULL = desabilitado';
    END IF;
  END $$;
`;

export const down = `
  ALTER TABLE inboxes DROP COLUMN IF EXISTS auto_close_minutes;
`;

