-- 가입 즉시 14일 Pro 무료 체험 부여.
-- subscriptions 테이블이 아닌 user_profiles에 trial 컬럼을 두는 이유:
-- 체험은 PayApp rebill_no/billing_cycle 등과 무관한 "계정 부여 entitlement"이므로
-- 결제 라이프사이클 테이블과 분리하는 것이 깔끔하다.
--
-- 트라이얼 stamping은 DB column DEFAULT가 담당한다 (race-safe, 단일 INSERT에서 원자적으로 결정).
-- 애플리케이션 코드는 user_profiles INSERT만 하면 trial_*가 자동 채워진다.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ;

-- DEFAULT는 ADD COLUMN과 분리해 적용한다.
-- ADD COLUMN ... DEFAULT NOW()는 VOLATILE 함수라 기존 모든 행을 동시에 rewrite할 수 있다.
-- 두 단계로 나누면 ADD는 NULL로 빠르게 끝나고, 기존 행 백필은 아래 UPDATE로만 처리된다.
ALTER TABLE user_profiles
  ALTER COLUMN trial_started_at SET DEFAULT NOW(),
  ALTER COLUMN trial_ends_at    SET DEFAULT (NOW() + INTERVAL '14 days');

CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends_at
  ON user_profiles(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- 기존 가입자 백필.
-- NOTE: 마이그레이션 적용 시각 기준으로 14일이 카운트된다 — 배포 직전에 실행할 것.
-- 활성 구독자도 trial_*가 채워지지만 plan resolver에서 subscription 우선이므로 무해.
UPDATE user_profiles
   SET trial_started_at = NOW(),
       trial_ends_at    = NOW() + INTERVAL '14 days'
 WHERE trial_started_at IS NULL;
