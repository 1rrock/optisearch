"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useUserStore } from "@/shared/stores/user-store";

export function UserStoreSync() {
  const { data: session, status } = useSession();
  const setSession = useUserStore((s) => s.setSession);
  const setSessionLoading = useUserStore((s) => s.setSessionLoading);
  const setDashboard = useUserStore((s) => s.setDashboard);
  const setDashboardLoading = useUserStore((s) => s.setDashboardLoading);
  const fetchedRef = useRef(false);

  // Sync session
  useEffect(() => {
    setSessionLoading(status === "loading");
    if (status === "authenticated" && session?.user) {
      setSession({
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      });
    } else if (status === "unauthenticated") {
      setSession(null);
    }
  }, [session, status, setSession, setSessionLoading]);

  // Fetch dashboard once authenticated
  useEffect(() => {
    if (status !== "authenticated" || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchDashboard = async () => {
      setDashboardLoading(true);
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setDashboard(data);
        }
      } catch {
        // silent
      } finally {
        setDashboardLoading(false);
      }
    };

    void fetchDashboard();

    const interval = setInterval(() => void fetchDashboard(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [status, setDashboard, setDashboardLoading]);

  return null;
}
