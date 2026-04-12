ALTER TABLE saved_keywords
  ADD COLUMN IF NOT EXISTS analysis_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS analysis_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN saved_keywords.analysis_data IS 'Cached keyword analysis data for AI enrichment prompts';
COMMENT ON COLUMN saved_keywords.analysis_updated_at IS 'When analysis_data was last refreshed';
