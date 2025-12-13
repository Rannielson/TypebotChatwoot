export const up = `
  CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    chatwoot_url VARCHAR(500),
    chatwoot_token VARCHAR(500),
    chatwoot_account_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_tenants_name ON tenants(name);
`;

export const down = `
  DROP TABLE IF EXISTS tenants;
`;

