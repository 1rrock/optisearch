-- 트라이얼 1회 한정 부여를 위한 영구 기록 테이블.
-- 가입 → 탈퇴 → 재가입 시 user_profiles 행은 사라져도 trial_grants는 남아
-- 재가입 시 14일 무료 체험을 다시 부여하지 않도록 한다.
--
-- 부여 식별자는 email과 auth_user_id 두 가지를 모두 보관한다:
--   - email은 사용자가 동일한 사람임을 보장하는 가장 일반적인 키
--   - auth_user_id는 OAuth 동의에서 email을 못 얻는 케이스를 위한 보조 키
-- 두 컬럼 모두 partial unique index로 중복을 막아 race condition도 차단한다.

CREATE TABLE IF NOT EXISTS trial_grants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT,
  auth_user_id TEXT,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trial_grants_identifier_present
    CHECK (email IS NOT NULL OR auth_user_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_grants_email
  ON trial_grants(email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_grants_auth_user_id
  ON trial_grants(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 트라이얼 부여 결정은 application code로 이전한다.
-- DEFAULT를 제거해야 신규 INSERT 시 trial_grants 조회 결과에 따라
-- trial_started_at / trial_ends_at에 NULL 또는 NOW() / NOW()+14days를 명시 할당할 수 있다.
ALTER TABLE user_profiles
  ALTER COLUMN trial_started_at DROP DEFAULT,
  ALTER COLUMN trial_ends_at    DROP DEFAULT;

-- 기존 가입자를 trial_grants에 백필.
-- 이미 한 번 트라이얼을 받은 사람으로 간주 → 탈퇴 후 재가입 시 부여 차단.
INSERT INTO trial_grants (email, auth_user_id, granted_at)
SELECT email, auth_user_id, COALESCE(trial_started_at, NOW())
  FROM user_profiles
 WHERE email IS NOT NULL OR auth_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
