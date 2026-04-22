-- PayApp 정기결제 연동: subscriptions 확장 + 결제내역 + 보상큐 + 원자 웹훅 RPC
-- Phase 1: DB 스키마 + RPC 함수
-- 의존성: 20260406_webhook_events.sql (webhook_events 테이블, event_id UNIQUE)

-- ============================================================
-- ENUM 타입 (중복 생성 방지)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','stopped','expired','pending_cancel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pending_action_type AS ENUM ('upgrade','downgrade');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- subscriptions 테이블 확장 (테이블은 이미 존재, 컬럼 추가)
-- ============================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS rebill_no TEXT,
  ADD COLUMN IF NOT EXISTS pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS pending_action pending_action_type,
  ADD COLUMN IF NOT EXISTS pending_start_date DATE,
  ADD COLUMN IF NOT EXISTS status subscription_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_period_end DATE,
  ADD COLUMN IF NOT EXISTS last_charged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_charge_count INT DEFAULT 0;

-- ============================================================
-- payment_history 테이블 (결제 내역)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mul_no TEXT UNIQUE NOT NULL,
  rebill_no TEXT,
  amount INT NOT NULL,
  vat INT DEFAULT 0,
  pay_state INT,
  pay_type TEXT,
  purpose TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- failed_compensations 테이블 (보상 트랜잭션 실패 큐)
-- ============================================================

CREATE TABLE IF NOT EXISTS failed_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mul_no TEXT NOT NULL,
  step TEXT NOT NULL,
  payload JSONB NOT NULL,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_comp_pending
  ON failed_compensations(next_retry_at)
  WHERE resolved_at IS NULL;

-- ============================================================
-- 기존 webhook_events 재사용 (20260406_webhook_events.sql)
-- event_id = mul_no, event_type = 'payapp.payment' | 'payapp.rebill_charge' | 'payapp.cancel'
-- 테이블 신규생성 금지, 스키마 변경 금지.
-- ============================================================

-- ============================================================
-- process_payapp_webhook RPC 함수 (원자적 웹훅 처리)
-- ============================================================

CREATE OR REPLACE FUNCTION process_payapp_webhook(
  p_mul_no TEXT,
  p_event_type TEXT,
  p_user_id TEXT,
  p_rebill_no TEXT,
  p_amount INT,
  p_vat INT,
  p_pay_state INT,
  p_pay_type TEXT,
  p_purpose TEXT,
  p_receipt_url TEXT,
  p_target_plan TEXT,
  p_raw JSONB
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_already_processed BOOLEAN;
BEGIN
  -- advisory lock: 동일 사용자 동시 웹훅 직렬화
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id));

  -- 1) webhook_events 멱등: 존재하면 조용히 반환
  INSERT INTO webhook_events (event_id, event_type)
  VALUES (p_mul_no, p_event_type)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING TRUE INTO v_already_processed;

  IF v_already_processed IS NULL THEN
    RETURN jsonb_build_object('status','duplicate');
  END IF;

  -- 2) payment_history 삽입 (mul_no UNIQUE → 중복시 에러 → 전체 롤백)
  INSERT INTO payment_history
    (user_id, mul_no, rebill_no, amount, vat, pay_state, pay_type, purpose, receipt_url, paid_at, raw)
  VALUES
    (p_user_id, p_mul_no, p_rebill_no, p_amount, p_vat, p_pay_state, p_pay_type, p_purpose, p_receipt_url, NOW(), p_raw);

  -- 3) 플랜 업데이트 (target_plan이 있으면)
  IF p_target_plan IS NOT NULL THEN
    UPDATE user_profiles SET plan = p_target_plan, updated_at = NOW() WHERE auth_user_id = p_user_id;
    UPDATE subscriptions
       SET last_charged_at = NOW(),
           current_period_end = (NOW() + interval '30 days')::date,
           failed_charge_count = 0
     WHERE user_id = p_user_id AND rebill_no = p_rebill_no;
  END IF;

  RETURN jsonb_build_object('status','processed');
EXCEPTION WHEN OTHERS THEN
  -- 트랜잭션 자동 롤백 → webhook_events INSERT도 취소되어 PayApp 재시도가 정상 동작
  RAISE;
END;
$$;
