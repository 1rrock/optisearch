import { z } from "zod";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "@/shared/lib/api-helpers";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { saveSearchHistory } from "@/services/history-service";

const bodySchema = z.object({
  keyword: z.string().min(1),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { keyword } = parsed.data;

  const [user, adultResult, typoResult] = await Promise.all([
    getAuthenticatedUser(),
    checkAdult(keyword),
    correctTypo(keyword),
  ]);

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [rateLimitResult, limitError] = await Promise.all([
    checkRateLimit(user.userId),
    enforceUsageLimit(user.userId, user.plan, "search"),
  ]);

  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  if (user.plan === "free" && process.env.TURNSTILE_SECRET_KEY && parsed.data.turnstileToken) {
    const valid = await verifyTurnstileToken(parsed.data.turnstileToken);
    if (!valid) {
      return Response.json({ error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" }, { status: 403 });
    }
  }

  if (limitError) return limitError;

  try {
    if (adultResult.adult === "1") {
      return Response.json(
        { error: "성인 키워드는 분석할 수 없습니다." },
        { status: 400 }
      );
    }

    const correctedKeyword = typoResult.errata ? typoResult.errata : null;
    const effectiveKeyword = correctedKeyword ?? keyword;

    const stats = await getKeywordStats([effectiveKeyword]);
    const stat = stats.find(
      (s) => s.relKeyword.toLowerCase() === effectiveKeyword.toLowerCase()
    ) ?? stats[0];

    const pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    const mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    const totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    const competition = stat?.compIdx ?? "중간";

    const pcClicks = stat?.monthlyAvePcClkCnt ?? 0;
    const mobileClicks = stat?.monthlyAveMobileClkCnt ?? 0;
    const totalClicks = pcClicks + mobileClicks;
    const clickRate = totalSearchVolume > 0 ? totalClicks / totalSearchVolume : 0;

    // Record usage (non-blocking)
    void recordUsage(user.userId, "search", effectiveKeyword).catch(() => {});

    // Save search history (non-blocking) — uses a minimal result for history
    const planLimits = PLAN_LIMITS[user.plan];
    const historyLimit = planLimits.historyLimit;
    (async () => {
      try {
        // saveSearchHistory expects a KeywordSearchResult; we pass a minimal one.
        // The full analysis will overwrite it if it arrives later.
        await saveSearchHistory(user.userId, {
          keyword: effectiveKeyword,
          pcSearchVolume,
          mobileSearchVolume,
          totalSearchVolume,
          competition: competition as "낮음" | "중간" | "높음",
          clickRate,
          blogPostCount: 0,
          saturationIndex: { value: 0, label: "보통", score: 50 },
          keywordGrade: "C" as const,
          sectionData: null,
          topPosts: null,
          shoppingData: null,
          createdAt: new Date().toISOString(),
        });
        if (historyLimit !== -1) {
          const { createServerClient } = await import("@/shared/lib/supabase");
          const supabase = await createServerClient();
          const { count } = await supabase
            .from("keyword_searches")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.userId);
          if ((count ?? 0) > historyLimit) {
            const { data: oldest } = await supabase
              .from("keyword_searches")
              .select("id")
              .eq("user_id", user.userId)
              .order("created_at", { ascending: true })
              .limit((count ?? 0) - historyLimit);
            if (oldest && oldest.length > 0) {
              await supabase
                .from("keyword_searches")
                .delete()
                .in("id", oldest.map((r) => r.id));
            }
          }
        }
      } catch (err) {
        console.error("[analyze/quick] saveSearchHistory failed:", err instanceof Error ? err.message : err);
      }
    })();

    return Response.json({
      keyword: effectiveKeyword,
      correctedKeyword,
      pcSearchVolume,
      mobileSearchVolume,
      totalSearchVolume,
      competition,
      clickRate,
      plan: user.plan,
    });
  } catch (err) {
    console.error("[api/analyze/quick] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
