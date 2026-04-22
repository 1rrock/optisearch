-- 1. pending_billing 상태 추가
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_billing';

-- 2. 빌키 관련 컬럼 추가
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS bill_key TEXT,
  ADD COLUMN IF NOT EXISTS next_billing_date DATE;
-- 주의: billing_plan 컬럼 불필요. pending_plan/pending_action으로 충분.

-- 3. Cron 쿼리 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON subscriptions(next_billing_date)
  WHERE next_billing_date IS NOT NULL AND bill_key IS NOT NULL;

-- 4. Cron 헬스체크 테이블
CREATE TABLE IF NOT EXISTS cron_health (
  job TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL,
  last_result JSONB
);
