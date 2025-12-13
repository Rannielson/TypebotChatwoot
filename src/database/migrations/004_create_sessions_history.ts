export const up = `
  CREATE TABLE IF NOT EXISTS sessions_history (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    conversation_id INTEGER NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    typebot_session_id VARCHAR(255) NOT NULL,
    typebot_result_id VARCHAR(255),
    typebot_public_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    UNIQUE(tenant_id, inbox_id, conversation_id, phone_number, typebot_session_id)
  );

  CREATE INDEX idx_sessions_tenant_inbox ON sessions_history(tenant_id, inbox_id);
  CREATE INDEX idx_sessions_conversation ON sessions_history(conversation_id);
  CREATE INDEX idx_sessions_phone ON sessions_history(phone_number);
  CREATE INDEX idx_sessions_status ON sessions_history(status);
  CREATE INDEX idx_sessions_typebot_session ON sessions_history(typebot_session_id);
  CREATE INDEX idx_sessions_active ON sessions_history(tenant_id, inbox_id, conversation_id, phone_number) WHERE status = 'active';
`;

export const down = `
  DROP TABLE IF EXISTS sessions_history;
`;

