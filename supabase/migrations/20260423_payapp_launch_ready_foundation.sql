-- PayApp commercial launch foundation
-- Phase 2 only: canonical webhook/idempotency schema repair + durable payment attempt ledger.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.payapp_webhook_event_key(
  p_provider TEXT,
  p_mul_no TEXT,
  p_pay_state INT,
  p_purpose TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_rebill_no TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CONCAT_WS(
    ':',
    COALESCE(NULLIF(p_provider, ''), 'payapp'),
    COALESCE(NULLIF(p_mul_no, ''), NULLIF(p_user_id, ''), 'missing-event'),
    COALESCE(p_pay_state::TEXT, 'unknown-state'),
    COALESCE(NULLIF(p_purpose, ''), NULLIF(p_rebill_no, ''), 'unknown-purpose')
  );
$$;

CREATE OR REPLACE FUNCTION public.payapp_webhook_lifecycle_key(
  p_provider TEXT,
  p_mul_no TEXT,
  p_purpose TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_rebill_no TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CONCAT_WS(
    ':',
    COALESCE(NULLIF(p_provider, ''), 'payapp'),
    COALESCE(NULLIF(p_mul_no, ''), NULLIF(p_user_id, ''), 'missing-event'),
    COALESCE(NULLIF(p_purpose, ''), NULLIF(p_rebill_no, ''), 'unknown-purpose')
  );
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'webhook_events'
  )
    AND NOT EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events'
         AND column_name = 'event_key'
    )
    AND NOT EXISTS (
      SELECT 1
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events_legacy_20260423'
    )
  THEN
    ALTER TABLE public.webhook_events RENAME TO webhook_events_legacy_20260423;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'payapp',
  event_key TEXT NOT NULL,
  lifecycle_key TEXT NOT NULL,
  mul_no TEXT,
  pay_state INT,
  purpose TEXT,
  user_id TEXT,
  rebill_no TEXT,
  provider_paid_at TIMESTAMPTZ,
  provider_cancelled_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received',
  duplicate_count INT NOT NULL DEFAULT 0,
  failure_reason TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_events_processing_status_check
    CHECK (processing_status IN ('received', 'processed', 'duplicate', 'failed', 'manual_review'))
);

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'payapp',
  ADD COLUMN IF NOT EXISTS event_key TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_key TEXT,
  ADD COLUMN IF NOT EXISTS mul_no TEXT,
  ADD COLUMN IF NOT EXISTS pay_state INT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS rebill_no TEXT,
  ADD COLUMN IF NOT EXISTS provider_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS duplicate_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.webhook_events
  DROP CONSTRAINT IF EXISTS webhook_events_processing_status_check;

ALTER TABLE public.webhook_events
  ADD CONSTRAINT webhook_events_processing_status_check
  CHECK (processing_status IN ('received', 'processed', 'duplicate', 'failed', 'manual_review'));

UPDATE public.webhook_events
   SET event_key = COALESCE(
         event_key,
         public.payapp_webhook_event_key(provider, mul_no, pay_state, purpose, user_id, rebill_no),
         CONCAT('legacy:', id::TEXT)
       ),
       lifecycle_key = COALESCE(
         lifecycle_key,
         public.payapp_webhook_lifecycle_key(provider, mul_no, purpose, user_id, rebill_no),
         CONCAT('legacy:', id::TEXT)
       ),
       last_received_at = COALESCE(last_received_at, received_at, NOW()),
       raw = COALESCE(raw, '{}'::jsonb),
       updated_at = COALESCE(updated_at, NOW())
 WHERE event_key IS NULL OR lifecycle_key IS NULL OR raw IS NULL OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_event_key
  ON public.webhook_events(event_key);

CREATE INDEX IF NOT EXISTS idx_webhook_events_lifecycle_key
  ON public.webhook_events(lifecycle_key, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status
  ON public.webhook_events(processing_status, received_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'webhook_events_legacy_20260423'
  ) THEN
    IF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events_legacy_20260423'
         AND column_name = 'event_id'
    ) THEN
      EXECUTE $sql$
        INSERT INTO public.webhook_events (
          provider,
          event_key,
          lifecycle_key,
          received_at,
          last_received_at,
          processed_at,
          processing_status,
          raw,
          created_at,
          updated_at
        )
        SELECT
          'legacy',
          CONCAT('legacy:', event_id),
          CONCAT('legacy:', event_id),
          COALESCE(created_at, processed_at, NOW()),
          COALESCE(processed_at, created_at, NOW()),
          processed_at,
          'processed',
          jsonb_build_object(
            'legacy_event_id', event_id,
            'legacy_event_type', event_type,
            'legacy_created_at', created_at
          ),
          COALESCE(created_at, NOW()),
          NOW()
        FROM public.webhook_events_legacy_20260423
        ON CONFLICT (event_key) DO NOTHING
      $sql$;
    ELSIF EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'webhook_events_legacy_20260423'
         AND column_name = 'mul_no'
    ) THEN
      EXECUTE $sql$
        INSERT INTO public.webhook_events (
          provider,
          event_key,
          lifecycle_key,
          mul_no,
          pay_state,
          purpose,
          received_at,
          last_received_at,
          processed_at,
          processing_status,
          raw,
          created_at,
          updated_at
        )
        SELECT
          'payapp',
          public.payapp_webhook_event_key('payapp', mul_no, pay_state, purpose, NULL, NULL),
          public.payapp_webhook_lifecycle_key('payapp', mul_no, purpose, NULL, NULL),
          mul_no,
          pay_state,
          purpose,
          COALESCE(processed_at, NOW()),
          COALESCE(processed_at, NOW()),
          processed_at,
          'processed',
          COALESCE(
            raw,
            jsonb_build_object(
              'legacy_mul_no', mul_no,
              'legacy_pay_state', pay_state,
              'legacy_purpose', purpose
            )
          ),
          COALESCE(processed_at, NOW()),
          NOW()
        FROM public.webhook_events_legacy_20260423
        ON CONFLICT (event_key) DO NOTHING
      $sql$;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'payapp_webhook_events'
  ) THEN
    -- 구 테이블의 스키마가 불명확하므로 EXCEPTION으로 방어. 데이터 이관 실패 시 NOTICE만 남기고 계속 진행.
    BEGIN
      EXECUTE $sql$
        INSERT INTO public.webhook_events (
          provider,
          event_key,
          lifecycle_key,
          mul_no,
          pay_state,
          purpose,
          user_id,
          rebill_no,
          provider_paid_at,
          provider_cancelled_at,
          received_at,
          last_received_at,
          processed_at,
          processing_status,
          duplicate_count,
          failure_reason,
          raw,
          created_at,
          updated_at
        )
        SELECT
          'payapp',
          public.payapp_webhook_event_key('payapp', mul_no, pay_state, purpose, user_id, rebill_no),
          public.payapp_webhook_lifecycle_key('payapp', mul_no, purpose, user_id, rebill_no),
          mul_no,
          pay_state,
          purpose,
          user_id,
          rebill_no,
          provider_paid_at,
          provider_cancelled_at,
          COALESCE(received_at, NOW()),
          COALESCE(received_at, NOW()),
          processed_at,
          COALESCE(processing_status, 'processed'),
          0,
          failure_reason,
          COALESCE(raw, '{}'::jsonb),
          COALESCE(created_at, received_at, NOW()),
          COALESCE(updated_at, NOW())
        FROM public.payapp_webhook_events
        ON CONFLICT (event_key) DO UPDATE
           SET duplicate_count = GREATEST(public.webhook_events.duplicate_count, EXCLUDED.duplicate_count),
               processed_at = COALESCE(public.webhook_events.processed_at, EXCLUDED.processed_at),
               updated_at = NOW()
      $sql$;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'payapp_webhook_events 데이터 이관 건너뜀 (스키마 불일치): %', SQLERRM;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  subscription_id UUID,
  attempt_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  rebill_no TEXT,
  bill_key TEXT,
  mul_no TEXT,
  payapp_event_key TEXT,
  provider TEXT NOT NULL DEFAULT 'payapp',
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_response_payload JSONB,
  manual_review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_attempts_attempt_kind_check
    CHECK (attempt_kind IN ('first_charge', 'renewal', 'upgrade_diff', 'refund', 'remote_cleanup')),
  CONSTRAINT payment_attempts_status_check
    CHECK (
      status IN (
        'pending',
        'requested',
        'succeeded',
        'failed',
        'unknown',
        'cancelled',
        'dispatched',
        'provider_unknown',
        'confirmed',
        'manual_review'
      )
    )
);

ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KRW',
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rebill_no TEXT,
  ADD COLUMN IF NOT EXISTS bill_key TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'payapp',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payapp_event_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_response_payload JSONB,
  ADD COLUMN IF NOT EXISTS manual_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.payment_attempts
  DROP CONSTRAINT IF EXISTS payment_attempts_attempt_kind_check;

ALTER TABLE public.payment_attempts
  ADD CONSTRAINT payment_attempts_attempt_kind_check
  CHECK (attempt_kind IN ('first_charge', 'renewal', 'upgrade_diff', 'refund', 'remote_cleanup'));

ALTER TABLE public.payment_attempts
  DROP CONSTRAINT IF EXISTS payment_attempts_status_check;

ALTER TABLE public.payment_attempts
  ADD CONSTRAINT payment_attempts_status_check
  CHECK (
    status IN (
      'pending',
      'requested',
      'succeeded',
      'failed',
      'unknown',
      'cancelled',
      'dispatched',
      'provider_unknown',
      'confirmed',
      'manual_review'
    )
  );

UPDATE public.payment_attempts
   SET available_at = COALESCE(available_at, requested_at, created_at, NOW()),
       currency = COALESCE(NULLIF(currency, ''), 'KRW'),
       provider = COALESCE(NULLIF(provider, ''), 'payapp'),
       metadata = COALESCE(metadata, '{}'::jsonb),
       provider_request_payload = COALESCE(provider_request_payload, '{}'::jsonb),
       created_at = COALESCE(created_at, requested_at, NOW()),
       updated_at = COALESCE(updated_at, resolved_at, requested_at, NOW())
 WHERE available_at IS NULL
    OR currency IS NULL
    OR provider IS NULL
    OR metadata IS NULL
    OR provider_request_payload IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_claim_queue
  ON public.payment_attempts(attempt_kind, status, available_at ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_mul_no
  ON public.payment_attempts(mul_no)
  WHERE mul_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_status
  ON public.payment_attempts(user_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_payapp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_attempts_set_updated_at ON public.payment_attempts;
CREATE TRIGGER payment_attempts_set_updated_at
BEFORE UPDATE ON public.payment_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_payapp_updated_at();

DROP TRIGGER IF EXISTS webhook_events_set_updated_at ON public.webhook_events;
CREATE TRIGGER webhook_events_set_updated_at
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.set_payapp_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_single_open_first_charge_attempt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.attempt_kind = 'first_charge'
     AND NEW.status IN ('pending', 'requested', 'unknown', 'dispatched', 'provider_unknown', 'manual_review')
     AND EXISTS (
       SELECT 1
         FROM public.payment_attempts existing
        WHERE existing.user_id = NEW.user_id
          AND existing.attempt_kind = 'first_charge'
          AND existing.status IN ('pending', 'requested', 'unknown', 'dispatched', 'provider_unknown', 'manual_review')
          AND existing.id IS DISTINCT FROM NEW.id
     ) THEN
    RAISE EXCEPTION 'open first_charge attempt already exists for user %', NEW.user_id
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_attempts_single_open_first_charge ON public.payment_attempts;
CREATE TRIGGER payment_attempts_single_open_first_charge
BEFORE INSERT OR UPDATE ON public.payment_attempts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_open_first_charge_attempt();

CREATE OR REPLACE FUNCTION public.apply_payapp_webhook_event(
  p_provider TEXT,
  p_mul_no TEXT,
  p_pay_state INT,
  p_purpose TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_rebill_no TEXT DEFAULT NULL,
  p_provider_paid_at TIMESTAMPTZ DEFAULT NULL,
  p_provider_cancelled_at TIMESTAMPTZ DEFAULT NULL,
  p_received_at TIMESTAMPTZ DEFAULT NOW(),
  p_raw JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  webhook_event_id UUID,
  event_key TEXT,
  lifecycle_key TEXT,
  processing_result TEXT,
  duplicate_count INT
)
LANGUAGE sql
AS $$
  WITH upserted AS (
    INSERT INTO public.webhook_events (
      provider,
      event_key,
      lifecycle_key,
      mul_no,
      pay_state,
      purpose,
      user_id,
      rebill_no,
      provider_paid_at,
      provider_cancelled_at,
      received_at,
      last_received_at,
      processing_status,
      raw
    )
    VALUES (
      COALESCE(NULLIF(p_provider, ''), 'payapp'),
      public.payapp_webhook_event_key(p_provider, p_mul_no, p_pay_state, p_purpose, p_user_id, p_rebill_no),
      public.payapp_webhook_lifecycle_key(p_provider, p_mul_no, p_purpose, p_user_id, p_rebill_no),
      p_mul_no,
      p_pay_state,
      p_purpose,
      p_user_id,
      p_rebill_no,
      p_provider_paid_at,
      p_provider_cancelled_at,
      COALESCE(p_received_at, NOW()),
      COALESCE(p_received_at, NOW()),
      'received',
      COALESCE(p_raw, '{}'::jsonb)
    )
    ON CONFLICT (event_key) DO UPDATE
       SET duplicate_count = public.webhook_events.duplicate_count + 1,
           last_received_at = COALESCE(p_received_at, NOW()),
           raw = COALESCE(p_raw, public.webhook_events.raw),
           updated_at = NOW()
    RETURNING public.webhook_events.id, public.webhook_events.event_key, public.webhook_events.lifecycle_key, public.webhook_events.duplicate_count, xmax = 0 AS inserted
  )
  SELECT
    id,
    event_key,
    lifecycle_key,
    CASE WHEN inserted THEN 'received' ELSE 'duplicate' END,
    duplicate_count
  FROM upserted;
$$;

CREATE OR REPLACE FUNCTION public.claim_pending_signup_charge_attempts(p_limit INT DEFAULT 10)
RETURNS SETOF public.payment_attempts
LANGUAGE sql
AS $$
  WITH claimable AS (
    SELECT id
      FROM public.payment_attempts
     WHERE attempt_kind = 'first_charge'
       AND status = 'pending'
       AND available_at <= NOW()
     ORDER BY available_at ASC, created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT GREATEST(p_limit, 0)
  )
  UPDATE public.payment_attempts attempt
     SET status = 'requested',
         claimed_at = NOW(),
         requested_at = COALESCE(attempt.requested_at, NOW()),
         updated_at = NOW()
    FROM claimable
   WHERE attempt.id = claimable.id
  RETURNING attempt.*;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_recurring_charge_attempts(p_limit INT DEFAULT 10)
RETURNS SETOF public.payment_attempts
LANGUAGE sql
AS $$
  WITH claimable AS (
    SELECT id
      FROM public.payment_attempts
     WHERE attempt_kind = 'renewal'
       AND status = 'pending'
       AND available_at <= NOW()
     ORDER BY available_at ASC, created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT GREATEST(p_limit, 0)
  )
  UPDATE public.payment_attempts attempt
     SET status = 'requested',
         claimed_at = NOW(),
         requested_at = COALESCE(attempt.requested_at, NOW()),
         updated_at = NOW()
    FROM claimable
   WHERE attempt.id = claimable.id
  RETURNING attempt.*;
$$;
