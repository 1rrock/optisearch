import { createServerClient } from "@/shared/lib/supabase";

export type NotificationType = "rank_change" | "system";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function mapNotificationRow(row: {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    payload: row.payload,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listNotifications(input: {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationItem[]> {
  const supabase = await createServerClient();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  let query = supabase
    .from("notifications")
    .select("id, user_id, type, title, message, payload, is_read, read_at, created_at")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return (data ?? []).map(mapNotificationRow);
}

export async function markNotificationAsRead(input: { userId: string; notificationId: string }): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", input.notificationId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
}): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    payload: input.payload ?? null,
    dedupe_key: input.dedupeKey ?? null,
  });

  if (error) {
    // Unique dedupe_key conflict is safe to ignore (already created)
    if (error.code === "23505") return;
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}
