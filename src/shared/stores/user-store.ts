import { create } from "zustand";
import { PLAN_LIMITS, type PlanId } from "@/shared/config/constants";

interface UserState {
  // Session
  name: string | null;
  email: string | null;
  image: string | null;
  isAuthenticated: boolean;
  sessionLoading: boolean;

  // Plan & usage
  plan: PlanId;
  usage: { search: number; analyze: number; draft: number };
  limits: { dailySearch: number; dailyAnalyze: number; dailyDraft: number };

  // Dashboard data
  recentSearches: Array<{
    keyword: string;
    grade: string | null;
    totalVolume: number;
    createdAt: string;
  }>;
  savedKeywordsCount: number;
  totalSearches: number;

  // Loading
  dashboardLoading: boolean;
  initialized: boolean;

  // Actions
  setSession: (session: { name: string | null; email: string | null; image: string | null } | null) => void;
  setSessionLoading: (loading: boolean) => void;
  setDashboard: (data: Record<string, unknown>) => void;
  setDashboardLoading: (loading: boolean) => void;
  incrementUsage: (feature: "search" | "analyze" | "draft") => void;
  isOverLimit: (feature: "search" | "analyze" | "draft") => boolean;
  refresh: () => Promise<void>;
}

const FREE_LIMITS = PLAN_LIMITS.free;

export const useUserStore = create<UserState>((set, get) => ({
  // Session defaults
  name: null,
  email: null,
  image: null,
  isAuthenticated: false,
  sessionLoading: true,

  // Plan defaults
  plan: "free",
  usage: { search: 0, analyze: 0, draft: 0 },
  limits: {
    dailySearch: FREE_LIMITS.dailySearch,
    dailyAnalyze: FREE_LIMITS.dailyAnalyze,
    dailyDraft: FREE_LIMITS.dailyDraft,
  },

  // Dashboard defaults
  recentSearches: [],
  savedKeywordsCount: 0,
  totalSearches: 0,

  // Loading
  dashboardLoading: false,
  initialized: false,

  // Actions
  setSession: (session) => {
    if (session) {
      set({ name: session.name, email: session.email, image: session.image, isAuthenticated: true });
    } else {
      set({ name: null, email: null, image: null, isAuthenticated: false });
    }
  },

  setSessionLoading: (loading) => set({ sessionLoading: loading }),

  setDashboard: (data) => {
    const plan = (data.plan as PlanId) ?? "free";
    const planLimits = PLAN_LIMITS[plan];
    const usage = (data.usage as UserState["usage"]) ?? { search: 0, analyze: 0, draft: 0 };
    const recentSearches = (data.recentSearches as UserState["recentSearches"]) ?? [];
    const savedKeywordsCount = (data.savedKeywordsCount as number) ?? 0;
    const totalSearches = (data.totalSearches as number) ?? 0;

    set({
      plan,
      usage,
      limits: {
        dailySearch: planLimits.dailySearch,
        dailyAnalyze: planLimits.dailyAnalyze,
        dailyDraft: planLimits.dailyDraft,
      },
      recentSearches,
      savedKeywordsCount,
      totalSearches,
      initialized: true,
    });
  },

  setDashboardLoading: (loading) => set({ dashboardLoading: loading }),

  incrementUsage: (feature) => {
    set((state) => ({
      usage: { ...state.usage, [feature]: state.usage[feature] + 1 },
    }));
  },

  isOverLimit: (feature) => {
    const { usage, limits } = get();
    const limitMap = { search: "dailySearch", analyze: "dailyAnalyze", draft: "dailyDraft" } as const;
    const limit = limits[limitMap[feature]];
    return limit !== -1 && usage[feature] >= limit;
  },

  refresh: async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        get().setDashboard(data);
      }
    } catch {
      // silent
    }
  },
}));
