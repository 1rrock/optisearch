import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RankSnapshot {
  id: string;
  targetId: string;
  rank: number;
  checkedAt: string;
  createdAt: string;
}

export interface RankTrackTarget {
  id: string;
  userId: string;
  storeId: string;
  keyword: string;
  source: "naver" | "google";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RankTrackTargetWithLatest {
  target: RankTrackTarget;
  latestSnapshot: RankSnapshot | null;
}

interface RankSnapshotsResponse {
  snapshots: RankSnapshot[];
}

interface RankTrackTargetsResponse {
  targets: RankTrackTargetWithLatest[];
}

export interface CreateRankTrackPayload {
  keyword: string;
  storeId: string;
}

async function fetchRankSnapshots(targetId: string): Promise<RankSnapshotsResponse> {
  const searchParams = new URLSearchParams({ targetId });
  const res = await fetch(`/api/rank?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `순위 이력 조회 실패 (${res.status})`);
  }

  return res.json();
}

async function fetchRankTrackTargets(): Promise<RankTrackTargetsResponse> {
  const res = await fetch("/api/rank/track", { cache: "no-store" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `추적 대상 조회 실패 (${res.status})`);
  }

  return res.json();
}

async function createRankTrackTarget(payload: CreateRankTrackPayload): Promise<{ target: RankTrackTarget }> {
  const res = await fetch("/api/rank/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: payload.keyword,
      storeId: payload.storeId,
      source: "naver",
      isActive: true,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `추적 등록 실패 (${res.status})`);
  }

  return res.json();
}

async function deleteRankTrackTarget(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/rank/track?id=${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `추적 삭제 실패 (${res.status})`);
  }

  return res.json();
}

export function useRankTrackTargets() {
  return useQuery({
    queryKey: ["rank-track-targets"],
    queryFn: fetchRankTrackTargets,
  });
}

export function useRankSnapshots(targetId?: string) {
  return useQuery({
    queryKey: ["rank-snapshots", targetId],
    queryFn: () => fetchRankSnapshots(targetId as string),
    enabled: Boolean(targetId),
  });
}

export function useCreateRankTrackTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRankTrackTarget,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rank-track-targets"] });
      queryClient.invalidateQueries({ queryKey: ["rank-snapshots", data.target.id] });
    },
  });
}

export function useDeleteRankTrackTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRankTrackTarget,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["rank-track-targets"] });
      queryClient.invalidateQueries({ queryKey: ["rank-snapshots", id] });
    },
  });
}
