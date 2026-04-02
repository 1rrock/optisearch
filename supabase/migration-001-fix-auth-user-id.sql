-- ============================================
-- Migration 001: auth_user_id uuid → text
-- ============================================
-- Auth.js adapter를 제거하고 순수 JWT 방식으로 전환했으므로
-- user_profiles.auth_user_id를 uuid → text로 변경합니다.
-- 네이버 ID는 숫자 문자열이므로 uuid 타입과 호환되지 않습니다.
--
-- Supabase Dashboard → SQL Editor에서 실행하세요.
-- ============================================

-- 1. 기존 외래키 제약 제거
alter table user_profiles drop constraint if exists user_profiles_auth_user_id_fkey;

-- 2. 컬럼 타입 변경: uuid → text
alter table user_profiles alter column auth_user_id type text using auth_user_id::text;

-- 3. RLS 비활성화 (service_role 키 사용하므로 불필요)
alter table user_profiles disable row level security;
alter table subscriptions disable row level security;
alter table keyword_searches disable row level security;
alter table ai_usage disable row level security;
alter table saved_keywords disable row level security;

-- ============================================
-- 완료! dev 서버 재시작 후 다시 로그인하세요.
-- ============================================
