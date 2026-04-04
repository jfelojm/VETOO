-- Identificador de la última transacción PayPhone notificada (idempotencia / trazabilidad)
ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS payphone_transaction_id text;

COMMENT ON COLUMN negocios.payphone_transaction_id IS 'Último TransactionId de PayPhone aplicado a este negocio';
