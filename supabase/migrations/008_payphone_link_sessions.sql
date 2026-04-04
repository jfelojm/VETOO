-- Permite resolver negocio/plan cuando PayPhone solo acepta el cuerpo mínimo (sin additionalData)
CREATE TABLE IF NOT EXISTS payphone_link_sessions (
  client_transaction_id text PRIMARY KEY,
  negocio_id uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('basic', 'pro')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payphone_link_sessions_negocio_idx ON payphone_link_sessions(negocio_id);

ALTER TABLE payphone_link_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payphone_link_sessions IS 'Mapeo clientTransactionId → negocio para webhook PayPhone si el link se creó sin additionalData';
