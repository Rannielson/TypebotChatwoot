export const up = `
  -- Adiciona auto_close_bulk_interval_hours na tabela inboxes (se não existir)
  -- NULL = desabilitado, valor em horas = intervalo para executar encerramento em massa
  -- Exemplo: 1 = verifica a cada 1 hora, 2 = verifica a cada 2 horas, etc
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inboxes' AND column_name = 'auto_close_bulk_interval_hours'
    ) THEN
      ALTER TABLE inboxes ADD COLUMN auto_close_bulk_interval_hours INTEGER;
      COMMENT ON COLUMN inboxes.auto_close_bulk_interval_hours IS 'Intervalo em horas para executar encerramento em massa de sessões antigas. NULL = desabilitado. Exemplo: 1 = verifica a cada 1 hora';
    END IF;
  END $$;
`;

export const down = `
  ALTER TABLE inboxes DROP COLUMN IF EXISTS auto_close_bulk_interval_hours;
`;

