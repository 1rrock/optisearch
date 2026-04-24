-- PayApp rebillRegist-only 아키텍처 전환에 따른 스키마 정리
-- billKey/billPay/payment_attempts 기반 인프라 삭제

DROP VIEW IF EXISTS public.payapp_manual_review_queue;
DROP VIEW IF EXISTS public.payapp_pending_billing_queue;
DROP VIEW IF EXISTS public.payapp_failed_compensation_backlog;

DROP TABLE IF EXISTS public.payment_attempts CASCADE;
DROP TABLE IF EXISTS public.failed_compensations CASCADE;
DROP TABLE IF EXISTS public.webhook_events_legacy_20260423;
DROP TABLE IF EXISTS public.cron_health;

ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS bill_key;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS pending_plan;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS pending_action;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS pending_start_date;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS failed_charge_count;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS pending_billing_started_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS bill_key_registered_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS cancel_requested_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS remote_cleanup_required;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS remote_cleanup_queued_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS last_manual_review_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS last_manual_review_reason;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS legacy_billing_model;

DROP TYPE IF EXISTS public.pending_action_type;

-- 사용 안 되는 인덱스 정리
DROP INDEX IF EXISTS public.idx_subscriptions_pending_billing_started_at;
DROP INDEX IF EXISTS public.idx_subscriptions_remote_cleanup_required;

-- next_billing 인덱스 재정의 (bill_key 조건 제거)
DROP INDEX IF EXISTS public.idx_subscriptions_next_billing;
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON public.subscriptions (next_billing_date)
  WHERE next_billing_date IS NOT NULL;

NOTIFY pgrst, 'reload schema';
