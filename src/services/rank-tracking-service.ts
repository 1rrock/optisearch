import { createServerClient } from "@/shared/lib/supabase";
import { toKstMidnight } from "@/shared/lib/date-utils";

export type RankSource = "naver" | "google";

export interface RankTrackTarget {
  id: string;
  userId: string;
  storeId: string;
  keyword: string;
  source: RankSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankSnapshot {
  id: string;
  targetId: string;
  rank: number;
  checkedAt: string;
  createdAt: string;
}

export interface RankTrackTargetWithLatest {
  target: RankTrackTarget;
  latestSnapshot: RankSnapshot | null;
}

export async function listRankTrackTargets(
  userId: string,
  options?: { includeInactive?: boolean; limit?: number }
): Promise<RankTrackTargetWithLatest[]> {
  const includeInactive = options?.includeInactive ?? false;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);

  const supabase = await createServerClient();

  let query = supabase
    .from("rank_track_targets")
    .select("id, user_id, store_id, keyword, source, is_active, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch rank track targets: ${error.message}`);
  }

  const targets = (data ?? []).map(mapTargetRow);
  if (targets.length === 0) return [];

  const targetIds = targets.map((target) => target.id);
  const latestByTarget = await getLatestSnapshotsByTarget(targetIds);

  return targets.map((target) => ({
    target,
    latestSnapshot: latestByTarget.get(target.id) ?? null,
  }));
}

export async function createOrUpdateRankTrackTarget(input: {
  userId: string;
  storeId: string;
  keyword: string;
  source: RankSource;
  isActive?: boolean;
}): Promise<RankTrackTarget> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const normalizedStoreId = input.storeId.trim().toLowerCase();
  const normalizedKeyword = input.keyword.trim();

  const { data, error } = await supabase
    .from("rank_track_targets")
    .upsert(
      {
        user_id: input.userId,
        store_id: normalizedStoreId,
        keyword: normalizedKeyword,
        source: input.source,
        is_active: input.isActive ?? true,
        updated_at: now,
      },
      { onConflict: "user_id,store_id,keyword,source" }
    )
    .select("id, user_id, store_id, keyword, source, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to upsert rank track target: ${error.message}`);
  }

  return mapTargetRow(data);
}

export async function setRankTrackTargetActive(input: {
  userId: string;
  targetId: string;
  isActive: boolean;
}): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("rank_track_targets")
    .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
    .eq("id", input.targetId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to update target state: ${error.message}`);
  }
}

export async function deleteRankTrackTarget(userId: string, targetId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("rank_track_targets")
    .delete()
    .eq("id", targetId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete rank track target: ${error.message}`);
  }
}

export async function createRankSnapshot(input: {
  userId: string;
  targetId: string;
  rank: number;
  checkedAt?: string;
}): Promise<RankSnapshot> {
  const supabase = await createServerClient();

  const { data: target, error: targetError } = await supabase
    .from("rank_track_targets")
    .select("id")
    .eq("id", input.targetId)
    .eq("user_id", input.userId)
    .single();

  if (targetError || !target) {
    throw new Error("Target not found or not accessible by user.");
  }

  const checkedAt = input.checkedAt ?? toKstMidnight();
  const { data, error } = await supabase
    .from("rank_snapshots")
    .upsert(
      {
        target_id: input.targetId,
        rank: input.rank,
        checked_at: checkedAt,
      },
      { onConflict: "target_id,checked_at" }
    )
    .select("id, target_id, rank, checked_at, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to upsert rank snapshot: ${error.message}`);
  }

  return mapSnapshotRow(data);
}

export async function listRankSnapshots(input: {
  userId: string;
  targetId: string;
  limit?: number;
}): Promise<RankSnapshot[]> {
  const supabase = await createServerClient();

  const { data: target, error: targetError } = await supabase
    .from("rank_track_targets")
    .select("id")
    .eq("id", input.targetId)
    .eq("user_id", input.userId)
    .single();

  if (targetError || !target) {
    throw new Error("Target not found or not accessible by user.");
  }

  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const { data, error } = await supabase
    .from("rank_snapshots")
    .select("id, target_id, rank, checked_at, created_at")
    .eq("target_id", input.targetId)
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch rank snapshots: ${error.message}`);
  }

  return (data ?? []).map(mapSnapshotRow);
}

async function getLatestSnapshotsByTarget(targetIds: string[]): Promise<Map<string, RankSnapshot>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("rank_snapshots")
    .select("id, target_id, rank, checked_at, created_at")
    .in("target_id", targetIds)
    .order("checked_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch latest snapshots: ${error.message}`);
  }

  const latest = new Map<string, RankSnapshot>();
  for (const row of data ?? []) {
    if (!latest.has(row.target_id)) {
      latest.set(row.target_id, mapSnapshotRow(row));
    }
  }

  return latest;
}

function mapTargetRow(row: {
  id: string;
  user_id: string;
  store_id: string;
  keyword: string;
  source: RankSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): RankTrackTarget {
  return {
    id: row.id,
    userId: row.user_id,
    storeId: row.store_id,
    keyword: row.keyword,
    source: row.source,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshotRow(row: {
  id: string;
  target_id: string;
  rank: number;
  checked_at: string;
  created_at: string;
}): RankSnapshot {
  return {
    id: row.id,
    targetId: row.target_id,
    rank: row.rank,
    checkedAt: row.checked_at,
    createdAt: row.created_at,
  };
}
