-- Add news headline columns to keyword_trend_daily for trend enrichment.
-- Each trending keyword gets a best-effort matched news headline from Naver News.
ALTER TABLE keyword_trend_daily
  ADD COLUMN IF NOT EXISTS news_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS news_link TEXT DEFAULT NULL;
