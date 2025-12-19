export const up = `
  -- Cria usuário padrão para acesso à plataforma
  -- Email: admin@example.com
  -- Senha: admin123
  -- ⚠️ IMPORTANTE: Altere a senha após o primeiro login!
  
  DO $$
  BEGIN
    -- Verifica se o usuário já existe
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE email = 'admin@example.com'
    ) THEN
      -- Insere o usuário padrão com senha hasheada (admin123)
      INSERT INTO users (email, password_hash)
      VALUES (
        'admin@example.com',
        '$2b$10$uS5VgrDPVJZE5g4uWgrgXOM/40IKljDyXRxFxyD1nZNlBYMlSDkNC'
      );
      
      RAISE NOTICE 'Usuário padrão criado: admin@example.com';
    ELSE
      RAISE NOTICE 'Usuário admin@example.com já existe, pulando criação';
    END IF;
  END $$;
`;

export const down = `
  -- Remove o usuário padrão (apenas se existir)
  DELETE FROM users WHERE email = 'admin@example.com';
`;
