ALTER TABLE keyword_trend_daily
  ADD COLUMN IF NOT EXISTS composite_score NUMERIC(7,4) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_trend_daily_composite
  ON keyword_trend_daily (recorded_date DESC, composite_score DESC NULLS LAST);
