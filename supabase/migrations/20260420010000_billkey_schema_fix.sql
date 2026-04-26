-- Fix: subscriptions.status CHECK constraint에 pending_billing 추가
-- status 컬럼이 TEXT + CHECK constraint로 관리되므로 enum ADD VALUE 대신 constraint 재생성 필요

-- 기존 constraint 삭제 후 pending_billing 포함하여 재생성
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'stopped', 'expired', 'pending_cancel', 'pending_billing'));

-- 참고: subscription_status enum 타입이 존재하면 거기에도 추가 (중복 방지)
DO $$ BEGIN
  ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_billing';
EXCEPTION WHEN others THEN NULL;
END $$;
