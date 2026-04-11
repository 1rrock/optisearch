/**
 * Spearman rank correlation test for blog-ratio estimation.
 * Runs estimateVolumeFromBlogRatio on 8 censored keywords and compares
 * the estimated ranking against blog-count ranking.
 *
 * Usage: npx tsx --tsconfig tsconfig.json scripts/test-spearman.ts
 * (requires .env.local to be sourced or dotenv loaded)
 */

import "dotenv/config";
import { getKeywordStats } from "@/shared/lib/naver-searchad";
import { searchBlog } from "@/shared/lib/naver-search";
import { estimateVolumeFromBlogRatio } from "@/shared/lib/naver-datalab";

const CENSORED_KEYWORDS = [
  "전쟁",
  "선거",
  "대통령",
  "마약",
  "도박",
  "성형외과",
  "대출",
  "카지노",
];

function spearmanRank(arr: number[]): number[] {
  const sorted = arr
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v); // descending
  const ranks = new Array<number>(arr.length);
  sorted.forEach((item, rank) => {
    ranks[item.i] = rank + 1;
  });
  return ranks;
}

function spearmanCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const rx = spearmanRank(x);
  const ry = spearmanRank(y);
  let d2sum = 0;
  for (let i = 0; i < n; i++) {
    const d = rx[i] - ry[i];
    d2sum += d * d;
  }
  return 1 - (6 * d2sum) / (n * (n * n - 1));
}

async function main() {
  console.log("=== Spearman Blog-Ratio Estimation Test ===\n");

  const getAnchorVolumes = async (keywords: string[]) => {
    const stats = await getKeywordStats(keywords);
    const map = new Map<string, { pc: number; mobile: number }>();
    for (const s of stats) {
      map.set(s.relKeyword, { pc: s.monthlyPcQcCnt, mobile: s.monthlyMobileQcCnt });
    }
    return map;
  };

  const getBlogCount = async (kw: string) => {
    const r = await searchBlog(kw, 1);
    return r.total;
  };

  const estimatedVolumes: number[] = [];
  const blogCounts: number[] = [];
  const results: Array<{ keyword: string; estimated: number; blogCount: number; confidence: string }> = [];

  for (const kw of CENSORED_KEYWORDS) {
    try {
      const est = await estimateVolumeFromBlogRatio(kw, getAnchorVolumes, getBlogCount);
      const blogResult = await searchBlog(kw, 1);

      if (est) {
        estimatedVolumes.push(est.totalSearchVolume);
        blogCounts.push(blogResult.total);
        results.push({
          keyword: kw,
          estimated: est.totalSearchVolume,
          blogCount: blogResult.total,
          confidence: est.confidence ?? "unknown",
        });
        console.log(
          `  ${kw}: estimated=${est.totalSearchVolume.toLocaleString()}, blog=${blogResult.total.toLocaleString()}, confidence=${est.confidence}`
        );
      } else {
        console.log(`  ${kw}: estimation failed (null)`);
      }
    } catch (err) {
      console.error(`  ${kw}: error -`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n--- Results (${results.length}/${CENSORED_KEYWORDS.length} keywords) ---\n`);

  if (results.length < 3) {
    console.error("Too few successful estimates for Spearman calculation.");
    process.exit(1);
  }

  const spearman = spearmanCorrelation(estimatedVolumes, blogCounts);
  console.log(`Spearman correlation (estimated vs blog count): ${spearman.toFixed(4)}`);
  console.log(`Threshold: >= 0.90`);
  console.log(`Result: ${spearman >= 0.9 ? "PASS" : "FAIL"}`);

  if (spearman < 0.9) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
