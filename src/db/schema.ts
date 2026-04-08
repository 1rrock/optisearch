export interface KeywordRankRow {
  id: string;
  storeId: string;
  keyword: string;
  rank: number;
  trackedAt: Date;
}

export interface RankTrackingRow {
  id: string;
  userId: string;
  storeId: string;
  keyword: string;
  rank: number;
  checkedDate: Date;
  source: "naver" | "google";
  createdAt: Date;
}

export interface RankTrackTargetRow {
  id: string;
  userId: string;
  storeId: string;
  keyword: string;
  source: "naver" | "google";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RankSnapshotRow {
  id: string;
  targetId: string;
  rank: number;
  checkedAt: Date;
  createdAt: Date;
}

export const keywordRanks = {
  tableName: "keyword_ranks",
  columns: ["id", "store_id", "keyword", "rank", "tracked_at"] as const,
};

export const rankTracking = {
  tableName: "rank_tracking",
  columns: ["id", "user_id", "store_id", "keyword", "rank", "checked_date", "source", "created_at"] as const,
  indexes: {
    uniqueByUserKeywordDate: ["user_id", "keyword", "checked_date"] as const,
    byUserDate: ["user_id", "checked_date"] as const,
    byStoreKeywordDate: ["store_id", "keyword", "checked_date"] as const,
  },
};

export const rankTrackTargets = {
  tableName: "rank_track_targets",
  columns: ["id", "user_id", "store_id", "keyword", "source", "is_active", "created_at", "updated_at"] as const,
  indexes: {
    uniqueByUserStoreKeywordSource: ["user_id", "store_id", "keyword", "source"] as const,
    byUserActiveUpdatedAt: ["user_id", "is_active", "updated_at"] as const,
    byUserCreatedAt: ["user_id", "created_at"] as const,
  },
};

export const rankSnapshots = {
  tableName: "rank_snapshots",
  columns: ["id", "target_id", "rank", "checked_at", "created_at"] as const,
  indexes: {
    uniqueByTargetCheckedAt: ["target_id", "checked_at"] as const,
    byTargetCheckedAt: ["target_id", "checked_at"] as const,
    byCheckedAt: ["checked_at"] as const,
  },
};
