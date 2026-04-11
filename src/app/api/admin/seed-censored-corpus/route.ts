import { getAuthenticatedUser } from "@/shared/lib/api-helpers";
import { estimateVolumeFromDataLab, getDatalabQuotaUsage } from "@/shared/lib/naver-datalab";
import { getVolumeMapFromCorpusOrSearchAd } from "@/services/keyword-service";
import { createServerClient } from "@/shared/lib/supabase";

/**
 * Known censored keywords that Naver SearchAd suppresses or returns floor values for.
 * Grouped by category for maintainability.
 */
const CENSORED_KEYWORDS: Record<string, string[]> = {
  정치시사: [
    "탄핵", "계엄", "계엄령", "비상계엄", "시위", "촛불시위", "집회",
    "북한", "김정은", "전쟁", "한국전쟁", "선거", "대선", "총선",
    "부정선거", "독재", "민주화", "광주민주화운동",
    "세월호", "이태원참사",
  ],
  도박사기: [
    "도박", "온라인도박", "불법도박", "토토", "스포츠토토", "사설토토",
    "바카라", "슬롯머신", "카지노", "온라인카지노",
    "사기", "보이스피싱", "먹튀", "먹튀검증", "다단계",
  ],
  약물: [
    "마약", "대마", "대마초", "필로폰", "코카인",
    "환각제", "각성제", "약물남용", "프로포폴",
  ],
  자해자살: [
    "자살", "자해", "극단적선택",
    "우울증", "공황장애", "조현병",
  ],
  폭력범죄: [
    "살인", "연쇄살인", "폭탄제조", "총기",
    "성폭행", "강간", "아동학대", "학교폭력", "스토킹",
    "묻지마범죄", "납치",
  ],
  재난: [
    "지진", "쓰나미", "원전사고", "방사능",
    "후쿠시마", "오염수",
  ],
  저작권: [
    "토렌트", "불법다운로드", "웹하드", "불법스트리밍",
  ],
  성인: [
    "딥페이크", "불법촬영", "몰카",
  ],
};

const ALL_KEYWORDS = Object.values(CENSORED_KEYWORDS).flat();

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);
  const isDev = process.env.NODE_ENV === "development";
  if (!user || (!isDev && (adminIds.length === 0 || !adminIds.includes(user.userId)))) {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  // Pre-check DataLab quota before starting expensive batch work
  const quota = await getDatalabQuotaUsage();
  if (quota.count > 800) {
    return Response.json(
      { error: `DataLab 할당량이 부족합니다. (${quota.count}/${quota.limit})`, code: "QUOTA_LOW" },
      { status: 429 }
    );
  }

  // Optional: pass specific category via body
  let body: { category?: string } = {};
  try { body = await request.json(); } catch { /* use all */ }

  const keywords = body.category && CENSORED_KEYWORDS[body.category]
    ? CENSORED_KEYWORDS[body.category]
    : ALL_KEYWORDS;

  const supabase = await createServerClient();
  const getRefVolumes = (kws: string[]) => getVolumeMapFromCorpusOrSearchAd(kws, supabase);

  const results: Array<{ keyword: string; status: string; volume?: number }> = [];
  let estimated = 0;
  let skipped = 0;
  let failed = 0;

  // Check which keywords already have non-zero corpus data
  const { data: existingRows } = await supabase
    .from("keyword_corpus")
    .select("keyword, pc_volume, mobile_volume")
    .in("keyword", keywords);

  const existingSet = new Set(
    (existingRows ?? [])
      .filter((r) => r.pc_volume > 0 || r.mobile_volume > 0)
      .map((r) => r.keyword)
  );

  // Process in batches of 5 to avoid DataLab quota pressure
  const BATCH_SIZE = 5;
  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (keyword) => {
      if (existingSet.has(keyword)) {
        skipped++;
        results.push({ keyword, status: "skipped (corpus exists)" });
        return;
      }

      try {
        const est = await estimateVolumeFromDataLab(keyword, getRefVolumes);
        if (est) {
          await supabase.from("keyword_corpus").upsert(
            {
              keyword,
              source_seed: "censored-seed",
              pc_volume: est.pcSearchVolume,
              mobile_volume: est.mobileSearchVolume,
              last_seen_at: new Date().toISOString().split("T")[0],
            },
            { onConflict: "keyword" }
          );
          estimated++;
          results.push({ keyword, status: "estimated", volume: est.totalSearchVolume });
        } else {
          failed++;
          results.push({ keyword, status: "estimation failed" });
        }
      } catch (err) {
        failed++;
        results.push({ keyword, status: `error: ${err instanceof Error ? err.message : String(err)}` });
      }
    });

    await Promise.all(promises);

    // Small delay between batches to respect DataLab rate limits
    if (i + BATCH_SIZE < keywords.length) {
      await new Promise((r) => setTimeout(r, 300));

      // Mid-batch quota check — stop early if approaching limit
      const midQuota = await getDatalabQuotaUsage();
      if (midQuota.count > 950) {
        results.push({ keyword: "(batch stopped)", status: `quota limit approaching (${midQuota.count}/${midQuota.limit})` });
        break;
      }
    }
  }

  return Response.json({
    total: keywords.length,
    estimated,
    skipped,
    failed,
    results,
  });
}
