-- Daily trending keyword data from DataLab ratio analysis
CREATE TABLE IF NOT EXISTS keyword_trend_daily (
  keyword TEXT NOT NULL,
  ratio_recent NUMERIC(5,1) NOT NULL,
  ratio_prev NUMERIC(5,1) NOT NULL,
  change_rate NUMERIC(7,2) NOT NULL,
  monthly_volume INT DEFAULT 0,
  estimated_delta INT DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (keyword, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_trend_daily_date
  ON keyword_trend_daily (recorded_date DESC, change_rate DESC);

ALTER TABLE keyword_trend_daily DISABLE ROW LEVEL SECURITY;
