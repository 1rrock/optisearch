"use client";

import { Bell, Check } from "lucide-react";
import { useMarkNotificationRead, useNotifications } from "@/features/notification/api/use-notifications";

export function NotificationPanel() {
  const { data, isLoading, error } = useNotifications(false);
  const markReadMutation = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];

  return (
    <section className="bg-card rounded-xl shadow-sm overflow-hidden border border-muted/50">
      <div className="px-6 py-5 border-b border-muted/50 flex items-center gap-2 bg-muted/10">
        <Bell className="size-4 text-primary" />
        <h3 className="text-lg font-bold tracking-tight">알림</h3>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3 animate-pulse">
          <div className="h-12 bg-muted/40 rounded" />
          <div className="h-12 bg-muted/40 rounded" />
          <div className="h-12 bg-muted/40 rounded" />
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-rose-500">알림을 불러오지 못했습니다: {error.message}</div>
      ) : notifications.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">새로운 알림이 없습니다.</div>
      ) : (
        <div className="divide-y divide-muted/30">
          {notifications.map((item) => (
            <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              {!item.isRead && (
                <button
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => markReadMutation.mutate(item.id)}
                  disabled={markReadMutation.isPending}
                >
                  <Check className="size-3" />
                  읽음
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
