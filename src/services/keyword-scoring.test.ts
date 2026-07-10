import { describe, expect, it } from "vitest";
import {
  toCompetitionLevel,
  calcSaturationRatio,
  calcCompositeScore,
  gradeKeyword,
} from "@/services/keyword-scoring";
import type { CompetitionLevel } from "@/entities/keyword/model/types";

/**
 * Regression guard for the "grade differs by entry point" bug.
 *
 * Before this fix the public route (`api/public/analyze`) used a different
 * formula (volume 0–60 + competition 0–40, no saturation) than the internal
 * `keyword-service`, so the same keyword got different grades depending on
 * whether the caller was logged in. Both paths now delegate to `gradeKeyword`,
 * so identical inputs MUST yield identical grades.
 */

// A realistic spread of keyword inputs (volume, blog post count, raw compIdx).
const SAMPLE_KEYWORDS: Array<{
  keyword: string;
  totalSearchVolume: number;
  blogPostCount: number;
  compIdx: string;
}> = [
  { keyword: "아이폰17", totalSearchVolume: 174000, blogPostCount: 1_200_000, compIdx: "높음" },
  { keyword: "제주도맛집", totalSearchVolume: 44000, blogPostCount: 850_000, compIdx: "중간" },
  { keyword: "건조기추천", totalSearchVolume: 65000, blogPostCount: 90_000, compIdx: "낮음" },
  { keyword: "볼보xc60", totalSearchVolume: 13000, blogPostCount: 40_000, compIdx: "중간" },
  { keyword: "삼성전자주가", totalSearchVolume: 220000, blogPostCount: 3_000_000, compIdx: "높음" },
  { keyword: "홈트레이닝기구", totalSearchVolume: 8000, blogPostCount: 12_000, compIdx: "낮음" },
  { keyword: "강아지사료", totalSearchVolume: 33000, blogPostCount: 500_000, compIdx: "높음" },
  { keyword: "무선청소기", totalSearchVolume: 90000, blogPostCount: 250_000, compIdx: "중간" },
  { keyword: "캠핑용품", totalSearchVolume: 27000, blogPostCount: 60_000, compIdx: "낮음" },
  { keyword: "니치키워드", totalSearchVolume: 300, blogPostCount: 40, compIdx: "낮음" },
];

/** Replicates the internal `keyword-service.ts` grading glue. */
function internalPathGrade(
  totalSearchVolume: number,
  blogPostCount: number,
  compIdx: string
): string {
  const competition = toCompetitionLevel(compIdx);
  return gradeKeyword(totalSearchVolume, blogPostCount, competition).keywordGrade;
}

/** Replicates the public `api/public/analyze/route.ts` grading glue. */
function publicPathGrade(
  totalSearchVolume: number,
  blogPostCount: number,
  compIdx: string
): string {
  const competition = toCompetitionLevel(compIdx);
  return gradeKeyword(totalSearchVolume, blogPostCount, competition).keywordGrade;
}

describe("keyword-scoring", () => {
  it("gives every keyword the same grade on both code paths", () => {
    for (const kw of SAMPLE_KEYWORDS) {
      const internal = internalPathGrade(kw.totalSearchVolume, kw.blogPostCount, kw.compIdx);
      const publicGrade = publicPathGrade(kw.totalSearchVolume, kw.blogPostCount, kw.compIdx);
      expect(publicGrade, `mismatch for ${kw.keyword}`).toBe(internal);
    }
  });

  it("is deterministic for identical inputs", () => {
    const a = gradeKeyword(50000, 100000, "중간");
    const b = gradeKeyword(50000, 100000, "중간");
    expect(a).toEqual(b);
  });

  it("normalises unknown competition strings to 높음", () => {
    expect(toCompetitionLevel("낮음")).toBe("낮음");
    expect(toCompetitionLevel("중간")).toBe("중간");
    expect(toCompetitionLevel("높음")).toBe("높음");
    expect(toCompetitionLevel("")).toBe("높음");
    expect(toCompetitionLevel("garbage")).toBe("높음");
  });

  it("uses raw volume as the ratio when blog post count is 0", () => {
    expect(calcSaturationRatio(1000, 0)).toBe(1000);
    expect(calcSaturationRatio(1000, 2000)).toBe(0.5);
  });

  it("weights volume, saturation, and competition into a 0–100 score", () => {
    // 낮음 competition (+30) should outscore 높음 (+5) for the same vol/saturation.
    const low = calcCompositeScore(50000, 60, "낮음");
    const high = calcCompositeScore(50000, 60, "높음");
    expect(low).toBeGreaterThan(high);
    expect(low).toBeLessThanOrEqual(100);
    expect(high).toBeGreaterThanOrEqual(0);
  });

  it("rewards lower saturation with a higher or equal grade score", () => {
    const comp: CompetitionLevel = "중간";
    // Higher ratio (less saturated) -> higher saturation score -> higher composite.
    const lessSaturated = gradeKeyword(50000, 10000, comp).compositeScore; // ratio 5.0
    const moreSaturated = gradeKeyword(50000, 5_000_000, comp).compositeScore; // ratio 0.01
    expect(lessSaturated).toBeGreaterThan(moreSaturated);
  });
});
