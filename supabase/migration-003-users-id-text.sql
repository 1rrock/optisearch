-- ============================================
-- Migration 003: users.id uuid → text
-- ============================================
-- 네이버 로그인 사용 시 user ID가 UUID 형식이 아닌
-- base64 문자열 (예: f6c6JAlJBo1e6JhKoVsr9SRGGpQJcXmLKL48rMkLZsQ)
-- 이므로 users.id를 text로 변경합니다.
--
-- Supabase Dashboard → SQL Editor에서 실행하세요.
-- ============================================

-- 1. 기존 외래키 제약 제거 (user_profiles → users)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_auth_user_id_fkey;

-- 2. users.id 타입 변경: uuid → text
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;

-- 3. RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 완료! 이후 로그인하면 자동으로 프로필이 생성됩니다.
-- ============================================
