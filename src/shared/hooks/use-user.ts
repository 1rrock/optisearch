import { useUserStore } from "@/shared/stores/user-store";
import { useShallow } from "zustand/react/shallow";

export function useUserName() {
  return useUserStore((s) => s.name);
}

export function useUserPlan() {
  return useUserStore((s) => s.plan);
}

export function useUsage() {
  return useUserStore(useShallow((s) => ({ usage: s.usage, limits: s.limits })));
}

export function useIsAuthenticated() {
  return useUserStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated, loading: s.sessionLoading })));
}

export function useDashboardData() {
  return useUserStore(useShallow((s) => ({
    plan: s.plan,
    isTrialExpired: s.isTrialExpired,
    trialEndsAt: s.trialEndsAt,
    usage: s.usage,
    limits: s.limits,
    recentSearches: s.recentSearches,
    savedKeywordsCount: s.savedKeywordsCount,
    totalSearches: s.totalSearches,
    loading: s.dashboardLoading,
    initialized: s.initialized,
  })));
}

export function useIncrementUsage() {
  return useUserStore((s) => s.incrementUsage);
}
