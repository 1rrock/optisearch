-- 보안 수정: 모든 테이블에 RLS 재활성화
-- anon key가 NEXT_PUBLIC_으로 브라우저에 노출되므로, RLS가 반드시 켜져 있어야 함
-- service_role key는 RLS를 우회하므로 서버사이드 코드에 영향 없음

-- Core user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Feature tables
ALTER TABLE keyword_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_trend_daily ENABLE ROW LEVEL SECURITY;

-- Rank tracking tables
ALTER TABLE rank_track_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_snapshots ENABLE ROW LEVEL SECURITY;

-- Webhook events (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_events') THEN
    EXECUTE 'ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 기본 정책: anon key로는 모든 접근 차단
-- service_role key는 RLS를 우회하므로 별도 정책 불필요
CREATE POLICY "Deny anon access" ON users FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON user_profiles FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON subscriptions FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON keyword_searches FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON ai_usage FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON saved_keywords FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON keyword_corpus FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON keyword_trend_daily FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON rank_track_targets FOR ALL USING (false);
CREATE POLICY "Deny anon access" ON rank_snapshots FOR ALL USING (false);
