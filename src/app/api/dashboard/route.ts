import { auth } from "@/auth";
import { createServerClient } from "@/shared/lib/supabase";

const EMPTY_DASHBOARD = {
  plan: "free" as const,
  usage: { search: 0, title: 0, draft: 0, score: 0 },
  recentSearches: [],
  savedKeywordsCount: 0,
  totalSearches: 0,
};

export async function GET() {
  try {
    const session = await auth();
    const authUserId = session?.user?.id;
    if (!authUserId) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Find or create user profile
    let profileId: string;
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id, plan")
      .eq("auth_user_id", authUserId)
      .single();

    if (existing) {
      profileId = existing.id;
    } else {
      // Auto-create profile on first dashboard visit
      const { data: created, error: createErr } = await supabase
        .from("user_profiles")
        .insert({
          auth_user_id: authUserId,
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
        })
        .select("id")
        .single();

      if (createErr || !created) {
        // DB not ready — return empty dashboard instead of error
        return Response.json(EMPTY_DASHBOARD);
      }
      profileId = created.id;
    }

    const plan = existing?.plan ?? "free";

    // Get today's usage counts
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("feature")
      .eq("user_id", profileId)
      .gte("created_at", `${today}T00:00:00`);

    const usage = { search: 0, title: 0, draft: 0, score: 0 };
    for (const row of usageData ?? []) {
      if (row.feature in usage) {
        usage[row.feature as keyof typeof usage]++;
      }
    }

    // Get recent searches (last 5)
    const { data: recentSearches } = await supabase
      .from("keyword_searches")
      .select("keyword, keyword_grade, pc_search_volume, mobile_search_volume, created_at")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get saved keywords count
    const { count: savedCount } = await supabase
      .from("saved_keywords")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileId);

    // Get total searches count
    const { count: totalSearches } = await supabase
      .from("keyword_searches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profileId);

    return Response.json({
      plan,
      usage,
      recentSearches: (recentSearches ?? []).map((s) => ({
        keyword: s.keyword,
        grade: s.keyword_grade,
        totalVolume: (s.pc_search_volume ?? 0) + (s.mobile_search_volume ?? 0),
        createdAt: s.created_at,
      })),
      savedKeywordsCount: savedCount ?? 0,
      totalSearches: totalSearches ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
