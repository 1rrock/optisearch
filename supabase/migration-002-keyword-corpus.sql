-- Migration 002: keyword_corpus table for daily SearchAd keyword collection
-- Stores all discovered keywords from SearchAd getRelatedKeywords() polling.
-- "New keywords" = rows where first_seen_at = target date.

CREATE TABLE IF NOT EXISTS keyword_corpus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  source_seed TEXT,                    -- which seed keyword discovered this
  pc_volume INT DEFAULT 0,
  mobile_volume INT DEFAULT 0,
  total_volume INT GENERATED ALWAYS AS (pc_volume + mobile_volume) STORED,
  competition TEXT,                    -- 높음/중간/낮음
  first_seen_at DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup for "new keywords on date X"
CREATE INDEX IF NOT EXISTS idx_corpus_first_seen ON keyword_corpus (first_seen_at DESC);

-- Fast lookup for volume sorting
CREATE INDEX IF NOT EXISTS idx_corpus_volume ON keyword_corpus (total_volume DESC);

-- Disable RLS (consistent with other tables in this project)
ALTER TABLE keyword_corpus DISABLE ROW LEVEL SECURITY;
