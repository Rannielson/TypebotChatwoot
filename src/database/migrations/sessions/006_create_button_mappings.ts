export const up = `
  CREATE TABLE IF NOT EXISTS button_mappings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions_history(id) ON DELETE CASCADE,
    button_title VARCHAR(255) NOT NULL,
    outgoing_edge_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, button_title)
  );

  CREATE INDEX idx_button_mappings_session ON button_mappings(session_id);
  CREATE INDEX idx_button_mappings_title ON button_mappings(button_title);
`;

export const down = `
  DROP TABLE IF EXISTS button_mappings;
`;

