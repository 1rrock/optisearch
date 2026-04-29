-- Composite index for daily usage count queries and dedup lookups
-- Improves performance of recordAndEnforce() and checkUsageLimit()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_user_feature_created
ON ai_usage (user_id, feature, created_at);
