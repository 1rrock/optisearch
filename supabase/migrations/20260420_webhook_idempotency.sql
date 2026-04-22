-- Webhook idempotency: 동일 mul_no 중복 수신 차단
CREATE TABLE IF NOT EXISTS webhook_events (
  mul_no TEXT PRIMARY KEY,
  pay_state INT NOT NULL,
  purpose TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at DESC);

-- Atomic failed_charge_count 증가 RPC
CREATE OR REPLACE FUNCTION increment_failed_charge_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE subscriptions
    SET failed_charge_count = COALESCE(failed_charge_count, 0) + 1
    WHERE user_id = p_user_id AND status = 'active'
    RETURNING failed_charge_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- stopped_reason: 해지 원인 추적
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stopped_reason TEXT
  CHECK (stopped_reason IN ('user_cancelled','charge_failed','refunded','expired') OR stopped_reason IS NULL);
