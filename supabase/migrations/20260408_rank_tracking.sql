CREATE TABLE IF NOT EXISTS rank_track_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'naver',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rank_track_targets_source_check CHECK (source IN ('naver', 'google')),
  CONSTRAINT rank_track_targets_user_store_keyword_source_unique UNIQUE (user_id, store_id, keyword, source)
);

CREATE TABLE IF NOT EXISTS rank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL REFERENCES rank_track_targets(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rank_snapshots_rank_check CHECK (rank >= 0),
  CONSTRAINT rank_snapshots_target_checked_at_unique UNIQUE (target_id, checked_at)
);

CREATE INDEX IF NOT EXISTS idx_rank_track_targets_user_active_updated_at
  ON rank_track_targets (user_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_track_targets_user_created_at
  ON rank_track_targets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_snapshots_target_checked_at
  ON rank_snapshots (target_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_snapshots_checked_at
  ON rank_snapshots (checked_at DESC);
