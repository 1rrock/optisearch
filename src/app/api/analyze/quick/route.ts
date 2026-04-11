import { z } from "zod";
import { checkAdult, correctTypo } from "@/shared/lib/naver-search";
import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { recordAndEnforce } from "@/services/usage-service";
import { signAnalysisToken } from "@/shared/lib/analysis-token";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { estimateVolumeFromBlogRatio, estimateVolumeFromDataLab } from "@/shared/lib/naver-datalab";
import type { ConfidenceLevel } from "@/shared/lib/naver-datalab";
import { PLAN_LIMITS, CENSORED_VOLUME_THRESHOLD, ANOMALY_VOLUME_THRESHOLD, ANOMALY_BLOG_THRESHOLD } from "@/shared/config/constants";
import { searchBlog } from "@/shared/lib/naver-search";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { verifyTurnstileToken } from "@/shared/lib/turnstile";
import { saveSearchHistory } from "@/services/history-service";
import { getVolumeMapFromCorpusOrSearchAd } from "@/services/keyword-service";
import { createServerClient } from "@/shared/lib/supabase";

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

  const rateLimitResult = await checkRateLimit(user.userId);

  if (!rateLimitResult.allowed) {
    return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  if (user.plan === "free" && process.env.TURNSTILE_SECRET_KEY && parsed.data.turnstileToken) {
    const valid = await verifyTurnstileToken(parsed.data.turnstileToken);
    if (!valid) {
      return Response.json({ error: "CAPTCHA 검증에 실패했습니다.", code: "CAPTCHA_FAILED" }, { status: 403 });
    }
  }

  try {
    const isAdult = adultResult.adult === "1";

    const correctedKeyword = typoResult.errata ? typoResult.errata : null;
    const effectiveKeyword = correctedKeyword ?? keyword;

    const stats = await getKeywordStats([effectiveKeyword]);
    const stat = stats.find(
      (s) => s.relKeyword.toLowerCase() === effectiveKeyword.toLowerCase()
    ) ?? stats[0];

    let pcSearchVolume = stat?.monthlyPcQcCnt ?? 0;
    let mobileSearchVolume = stat?.monthlyMobileQcCnt ?? 0;
    let totalSearchVolume = pcSearchVolume + mobileSearchVolume;
    let isEstimated = false;
    let confidence: ConfidenceLevel | undefined;

    // Reverse-estimate volume for censored keywords (SearchAd returns 0 or 10/10 floors)
    // Also detect anomalies: low SearchAd volume + high blog count = likely censored
    let needsFallback = totalSearchVolume <= CENSORED_VOLUME_THRESHOLD;

    if (!needsFallback && totalSearchVolume < ANOMALY_VOLUME_THRESHOLD) {
      try {
        const blogResult = await searchBlog(effectiveKeyword, 1);
        needsFallback = blogResult.total > ANOMALY_BLOG_THRESHOLD;
      } catch {
        // Anomaly detection is best-effort; skip fallback on API failure
      }
    }

    if (needsFallback) {
      // 1. Check keyword_corpus first — may have historical volume from before censorship
      const supabase = await createServerClient();
      const { data: corpusRow } = await supabase
        .from("keyword_corpus")
        .select("pc_volume, mobile_volume")
        .eq("keyword", effectiveKeyword)
        .single();

      if (corpusRow && (corpusRow.pc_volume + corpusRow.mobile_volume) > CENSORED_VOLUME_THRESHOLD) {
        // Corpus value is above censored floor — trust it
        pcSearchVolume = corpusRow.pc_volume;
        mobileSearchVolume = corpusRow.mobile_volume;
        totalSearchVolume = pcSearchVolume + mobileSearchVolume;
        isEstimated = true;
      } else {
        // 2. Blog-ratio estimation (primary fallback — unlimited API, perfect ranking)
        const blogEstimated = await estimateVolumeFromBlogRatio(
          effectiveKeyword,
          (keywords) => getVolumeMapFromCorpusOrSearchAd(keywords, supabase),
          async (kw) => { const r = await searchBlog(kw, 1); return r.total; }
        ).catch(() => null);

        if (blogEstimated) {
          pcSearchVolume = blogEstimated.pcSearchVolume;
          mobileSearchVolume = blogEstimated.mobileSearchVolume;
          totalSearchVolume = blogEstimated.totalSearchVolume;
          isEstimated = true;
          confidence = blogEstimated.confidence;

          // Cache to corpus for future requests
          supabase.from("keyword_corpus").upsert(
            {
              keyword: effectiveKeyword,
              source_seed: "blog-ratio",
              pc_volume: blogEstimated.pcSearchVolume,
              mobile_volume: blogEstimated.mobileSearchVolume,
              first_seen_at: new Date().toISOString().split("T")[0],
              last_seen_at: new Date().toISOString().split("T")[0],
            },
            { onConflict: "keyword" }
          ).then(() => {}, () => {});
        } else {
          // 3. DataLab estimation (last resort — limited API)
          const estimated = await estimateVolumeFromDataLab(
            effectiveKeyword,
            (keywords) => getVolumeMapFromCorpusOrSearchAd(keywords, supabase)
          );
          if (estimated) {
            pcSearchVolume = estimated.pcSearchVolume;
            mobileSearchVolume = estimated.mobileSearchVolume;
            totalSearchVolume = estimated.totalSearchVolume;
            isEstimated = true;
            confidence = estimated.confidence ?? "low";

            supabase.from("keyword_corpus").upsert(
              {
                keyword: effectiveKeyword,
                source_seed: "datalab-auto",
                pc_volume: estimated.pcSearchVolume,
                mobile_volume: estimated.mobileSearchVolume,
                first_seen_at: new Date().toISOString().split("T")[0],
                last_seen_at: new Date().toISOString().split("T")[0],
              },
              { onConflict: "keyword" }
            ).then(() => {}, () => {});
          }
        }
      }
    }

    const competition = stat?.compIdx ?? "중간";

    const pcCtr = (stat?.monthlyAvePcCtr ?? 0) / 100;
    const mobileCtr = (stat?.monthlyAveMobileCtr ?? 0) / 100;
    const clickRate = (pcCtr + mobileCtr) / 2;
    const estimatedClicks = Math.round(
      pcSearchVolume * pcCtr + mobileSearchVolume * mobileCtr
    );

    // Record usage after successful work (prevents quota loss on server errors)
    const usage = await recordAndEnforce(user.userId, user.plan, "search", effectiveKeyword);
    if (!usage.allowed) {
      return Response.json(
        { error: `일일 사용 한도를 초과했습니다. (${usage.used}/${usage.limit})`, code: "USAGE_LIMIT_EXCEEDED", used: usage.used, limit: usage.limit },
        { status: 429 }
      );
    }

    const analysisToken = signAnalysisToken({ userId: user.userId, keyword: effectiveKeyword, feature: "search" });

    // Save search history (non-blocking) — uses a minimal result for history
    const planLimits = PLAN_LIMITS[user.plan];
    const historyLimit = planLimits.historyLimit;
    saveSearchHistory(user.userId, {
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
    })
      .then(async () => {
        if (historyLimit === -1) return;
        const trimSupabase = await createServerClient();
        const { count } = await trimSupabase
          .from("keyword_searches")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.userId);
        if ((count ?? 0) > historyLimit) {
          const { data: oldest } = await trimSupabase
            .from("keyword_searches")
            .select("id")
            .eq("user_id", user.userId)
            .order("created_at", { ascending: true })
            .limit((count ?? 0) - historyLimit);
          if (oldest && oldest.length > 0) {
            await trimSupabase
              .from("keyword_searches")
              .delete()
              .in("id", oldest.map((r) => r.id));
          }
        }
      })
      .catch((err) => {
        console.error("[analyze/quick] saveSearchHistory failed:", err instanceof Error ? err.message : err);
      });

    return Response.json({
      keyword: effectiveKeyword,
      correctedKeyword,
      pcSearchVolume,
      mobileSearchVolume,
      totalSearchVolume,
      competition,
      clickRate,
      estimatedClicks,
      isEstimated: isEstimated || undefined,
      confidence: confidence || undefined,
      isAdult: isAdult || undefined,
      plan: user.plan,
      analysisToken: analysisToken ?? undefined,
    });
  } catch (err) {
    console.error("[api/analyze/quick] Error:", err);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
