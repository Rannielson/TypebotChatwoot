export const up = `
  CREATE TABLE IF NOT EXISTS message_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions_history(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    attachments JSONB,
    chatwoot_message_id VARCHAR(255),
    whatsapp_message_id VARCHAR(255),
    typebot_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_message_logs_session ON message_logs(session_id);
  CREATE INDEX idx_message_logs_direction ON message_logs(direction);
  CREATE INDEX idx_message_logs_created ON message_logs(created_at);
  CREATE INDEX idx_message_logs_chatwoot_id ON message_logs(chatwoot_message_id);
  CREATE INDEX idx_message_logs_whatsapp_id ON message_logs(whatsapp_message_id);
`;

export const down = `
  DROP TABLE IF EXISTS message_logs;
`;

