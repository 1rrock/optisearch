import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotificationItem {
  id: string;
  userId: string;
  type: "rank_change" | "system";
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
}

async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams({
    limit: "20",
    unreadOnly: unreadOnly ? "true" : "false",
  });
  const res = await fetch(`/api/notifications?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `알림 조회 실패 (${res.status})`);
  }

  return res.json();
}

async function markRead(notificationId: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `알림 읽음 처리 실패 (${res.status})`);
  }

  return res.json();
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
