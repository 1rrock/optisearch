-- PayApp commercial launch hardening
-- Canonicalizes payment state tables without depending on drifted legacy webhook_events schemas.

-- ============================================================
-- subscriptions.status drift normalization (enum -> text + CHECK)
-- ============================================================

DO $$
DECLARE
  v_udt_name TEXT;
BEGIN
  SELECT udt_name
    INTO v_udt_name
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'subscriptions'
     AND column_name = 'status';

  IF v_udt_name IS NOT NULL AND v_udt_name <> 'text' THEN
    EXECUTE 'ALTER TABLE public.subscriptions ALTER COLUMN status DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.subscriptions ALTER COLUMN status TYPE text USING status::text';
  END IF;
END $$;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'stopped', 'expired', 'pending_cancel', 'pending_billing'));

-- ============================================================
-- subscriptions lifecycle and ops metadata
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_billing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bill_key_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remote_cleanup_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remote_cleanup_queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_manual_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_manual_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS legacy_billing_model TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_legacy_billing_model_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_legacy_billing_model_check
  CHECK (legacy_billing_model IN ('none', 'rebill', 'bill_key', 'mixed'));

UPDATE public.subscriptions
   SET pending_billing_started_at = COALESCE(pending_billing_started_at, NOW())
 WHERE status = 'pending_billing';

UPDATE public.subscriptions
   SET legacy_billing_model = CASE
     WHEN bill_key IS NOT NULL AND rebill_no IS NOT NULL THEN 'mixed'
     WHEN bill_key IS NOT NULL THEN 'bill_key'
     WHEN rebill_no IS NOT NULL THEN 'rebill'
     ELSE 'none'
   END;

CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_billing_started_at
  ON public.subscriptions(status, pending_billing_started_at)
  WHERE status = 'pending_billing';

CREATE INDEX IF NOT EXISTS idx_subscriptions_remote_cleanup_required
  ON public.subscriptions(remote_cleanup_required, remote_cleanup_queued_at)
  WHERE remote_cleanup_required = TRUE;

-- ============================================================
-- Canonical PayApp webhook/event ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  lifecycle_key TEXT NOT NULL,
  mul_no TEXT,
  pay_state INT,
  purpose TEXT,
  user_id TEXT,
  rebill_no TEXT,
  provider_paid_at TIMESTAMPTZ,
  provider_cancelled_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received',
  failure_reason TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT payapp_webhook_events_processing_status_check
    CHECK (processing_status IN ('received', 'processed', 'duplicate', 'failed', 'manual_review'))
);

CREATE INDEX IF NOT EXISTS idx_payapp_webhook_events_lifecycle_key
  ON public.payapp_webhook_events(lifecycle_key, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_payapp_webhook_events_processing_status
  ON public.payapp_webhook_events(processing_status, received_at DESC);

-- Backfill drifted legacy webhook_events table if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'webhook_events'
  ) THEN
    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events'
         AND column_name = 'event_id'
    ) THEN
      INSERT INTO public.payapp_webhook_events (
        event_key,
        lifecycle_key,
        received_at,
        processed_at,
        processing_status,
        raw
      )
      SELECT
        CONCAT('legacy:', event_id, ':', COALESCE(event_type, 'unknown')),
        event_id,
        COALESCE(created_at, processed_at, NOW()),
        processed_at,
        'processed',
        jsonb_build_object(
          'legacy_event_id', event_id,
          'legacy_event_type', event_type,
          'legacy_created_at', created_at
        )
      FROM public.webhook_events
      ON CONFLICT (event_key) DO NOTHING;
    ELSIF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events'
         AND column_name = 'mul_no'
    ) THEN
      INSERT INTO public.payapp_webhook_events (
        event_key,
        lifecycle_key,
        mul_no,
        pay_state,
        purpose,
        received_at,
        processed_at,
        processing_status,
        raw
      )
      SELECT
        CONCAT(
          'legacy:',
          COALESCE(mul_no, 'missing'),
          ':',
          COALESCE(pay_state::TEXT, 'unknown'),
          ':',
          COALESCE(purpose, 'unknown')
        ),
        CONCAT(COALESCE(mul_no, 'missing'), ':', COALESCE(purpose, 'unknown')),
        mul_no,
        pay_state,
        purpose,
        processed_at,
        processed_at,
        'processed',
        COALESCE(
          raw,
          jsonb_build_object(
            'legacy_mul_no', mul_no,
            'legacy_pay_state', pay_state,
            'legacy_purpose', purpose
          )
        )
      FROM public.webhook_events
      ON CONFLICT (event_key) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================================
-- Canonical payment attempts / provider-unknown queue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  attempt_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INT NOT NULL,
  mul_no TEXT,
  payapp_event_key TEXT,
  provider_request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_response_payload JSONB,
  manual_review_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT payment_attempts_attempt_kind_check
    CHECK (attempt_kind IN ('first_charge', 'renewal', 'upgrade_diff', 'refund', 'remote_cleanup')),
  CONSTRAINT payment_attempts_status_check
    CHECK (status IN ('pending', 'dispatched', 'provider_unknown', 'confirmed', 'failed', 'manual_review', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_status_requested_at
  ON public.payment_attempts(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_status
  ON public.payment_attempts(user_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_mul_no
  ON public.payment_attempts(mul_no)
  WHERE mul_no IS NOT NULL;

-- ============================================================
-- payment_history provider timestamps / refund precision
-- ============================================================

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS provider_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount INT,
  ADD COLUMN IF NOT EXISTS payapp_event_key TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_history_provider_paid_at
  ON public.payment_history(provider_paid_at DESC);

-- ============================================================
-- Launch ops visibility views
-- ============================================================

CREATE OR REPLACE VIEW public.payapp_manual_review_queue AS
SELECT
  'payment_attempt'::TEXT AS source,
  id::TEXT AS reference_id,
  user_id,
  attempt_key AS reference_key,
  status,
  manual_review_reason AS reason,
  requested_at AS created_at
FROM public.payment_attempts
WHERE status IN ('provider_unknown', 'manual_review')

UNION ALL

SELECT
  'webhook_event'::TEXT AS source,
  id::TEXT AS reference_id,
  user_id,
  event_key AS reference_key,
  processing_status AS status,
  failure_reason AS reason,
  received_at AS created_at
FROM public.payapp_webhook_events
WHERE processing_status IN ('failed', 'manual_review');

CREATE OR REPLACE VIEW public.payapp_pending_billing_queue AS
SELECT
  user_id,
  plan,
  legacy_billing_model,
  pending_billing_started_at,
  bill_key_registered_at,
  next_billing_date,
  current_period_end
FROM public.subscriptions
WHERE status = 'pending_billing';

CREATE OR REPLACE VIEW public.payapp_failed_compensation_backlog AS
SELECT
  id,
  user_id,
  mul_no,
  step,
  retry_count,
  last_error,
  next_retry_at,
  escalated,
  created_at
FROM public.failed_compensations
WHERE resolved_at IS NULL;
