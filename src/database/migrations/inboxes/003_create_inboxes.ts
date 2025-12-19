export const up = `
  CREATE TABLE IF NOT EXISTS inboxes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inbox_id INTEGER NOT NULL,
    inbox_name VARCHAR(255),
    whatsapp_phone_number_id VARCHAR(255) NOT NULL,
    whatsapp_access_token TEXT NOT NULL,
    whatsapp_api_version VARCHAR(10) DEFAULT 'v21.0',
    typebot_base_url VARCHAR(500) NOT NULL,
    typebot_api_key VARCHAR(500),
    typebot_public_id VARCHAR(255) NOT NULL,
    chatwoot_api_token VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, inbox_id)
  );

  CREATE INDEX idx_inboxes_tenant_id ON inboxes(tenant_id);
  CREATE INDEX idx_inboxes_inbox_id ON inboxes(inbox_id);
  CREATE INDEX idx_inboxes_active ON inboxes(is_active);
`;

export const down = `
  DROP TABLE IF EXISTS inboxes;
`;

