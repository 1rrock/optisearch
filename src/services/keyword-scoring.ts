/**
 * Canonical keyword scoring module.
 *
 * This is the SINGLE source of truth for how a keyword grade is computed.
 * Both the authenticated path (`keyword-service.ts`) and the public path
 * (`api/public/analyze/route.ts`) MUST route through `gradeKeyword` so that
 * the same keyword always receives the same grade regardless of entry point.
 *
 * Composite score (0–100):
 *   - Search volume score (0–35): log-scaled
 *   - Saturation score    (0–35): from getSaturationThreshold
 *   - Competition inverse  (0–30): 낮음=30, 중간=15, 높음=5
 */

import type { CompetitionLevel, SaturationIndex } from "@/entities/keyword/model/types";
import type { KeywordGrade } from "@/shared/model/keyword-grade";
import { gradeFromScore, getSaturationThreshold } from "@/shared/config/constants";

/** Normalise a raw SearchAd compIdx string into a CompetitionLevel. */
export function toCompetitionLevel(raw: string): CompetitionLevel {
  if (raw === "낮음" || raw === "중간" || raw === "높음") return raw;
  return "높음";
}

/** Build a SaturationIndex from a saturation ratio (searchVolume / blogPostCount). */
export function buildSaturationIndex(ratio: number): SaturationIndex {
  const threshold = getSaturationThreshold(ratio);
  return {
    value: ratio,
    label: threshold.label,
    score: threshold.score,
  };
}

/**
 * Canonical saturation ratio = total search volume / blog post count.
 * When blog post count is 0 (or unknown), fall back to raw volume so the
 * ratio stays high (least-saturated bucket) instead of dividing by zero.
 */
export function calcSaturationRatio(
  totalSearchVolume: number,
  blogPostCount: number
): number {
  return blogPostCount > 0 ? totalSearchVolume / blogPostCount : totalSearchVolume;
}

/**
 * Composite score (0–100). See module header for the weighting breakdown.
 * @param saturationScore - the 0–100 score from a SaturationIndex/threshold.
 */
export function calcCompositeScore(
  totalSearchVolume: number,
  saturationScore: number,
  competition: CompetitionLevel
): number {
  // Volume score: log10(volume+1) normalised to [0, 35] assuming max ~1,000,000
  const maxLogVolume = Math.log10(1_000_000 + 1);
  const logVolume = Math.log10(totalSearchVolume + 1);
  const volumeScore = Math.min(35, (logVolume / maxLogVolume) * 35);

  // Saturation score: threshold.score is 0–100, scale to 0–35
  const satScore = (saturationScore / 100) * 35;

  // Competition inverse score
  const compScore =
    competition === "낮음" ? 30 : competition === "중간" ? 15 : 5;

  return Math.round(Math.min(100, volumeScore + satScore + compScore));
}

/**
 * Grade a keyword end-to-end from raw inputs. This is the function both code
 * paths call, guaranteeing identical grades for identical inputs.
 */
export function gradeKeyword(
  totalSearchVolume: number,
  blogPostCount: number,
  competition: CompetitionLevel
): { saturationIndex: SaturationIndex; compositeScore: number; keywordGrade: KeywordGrade } {
  const saturationRatio = calcSaturationRatio(totalSearchVolume, blogPostCount);
  const saturationIndex = buildSaturationIndex(saturationRatio);
  const compositeScore = calcCompositeScore(totalSearchVolume, saturationIndex.score, competition);
  return {
    saturationIndex,
    compositeScore,
    keywordGrade: gradeFromScore(compositeScore),
  };
}
