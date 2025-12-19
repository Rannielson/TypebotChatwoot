export const up = `
  -- Atualiza constraint de check_frequency_minutes para permitir mínimo de 1 minuto
  -- Remove constraint antiga e adiciona nova
  DO $$
  BEGIN
    -- Remove constraint antiga se existir
    ALTER TABLE triggers DROP CONSTRAINT IF EXISTS triggers_check_frequency_minutes_check;
    
    -- Adiciona nova constraint com mínimo de 1 minuto
    ALTER TABLE triggers ADD CONSTRAINT triggers_check_frequency_minutes_check 
      CHECK (check_frequency_minutes >= 1);
  END $$;
`;

export const down = `
  -- Reverte para mínimo de 3 minutos
  DO $$
  BEGIN
    ALTER TABLE triggers DROP CONSTRAINT IF EXISTS triggers_check_frequency_minutes_check;
    ALTER TABLE triggers ADD CONSTRAINT triggers_check_frequency_minutes_check 
      CHECK (check_frequency_minutes >= 3);
  END $$;
`;
