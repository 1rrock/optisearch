/**
 * 비로그인 공개 API용 IP 기반 레이트리밋 유틸리티.
 *
 * Redis(Upstash)가 설정된 경우 정확한 분산 카운팅을 수행하고,
 * 연결 실패 시 인메모리 Map으로 폴백합니다.
 * 키는 날짜별로 구성되어 24시간이 지나면 자동 만료됩니다.
 */

import { getRedis } from "./redis";

const TTL_SEC = 86_400; // 24시간

// ---------------------------------------------------------------------------
// 인메모리 폴백 (단일 인스턴스 전용)
// ---------------------------------------------------------------------------

interface PublicRateLimitEntry {
  count: number;
  expiresAt: number;
}

const memStore = new Map<string, PublicRateLimitEntry>();

// 10분마다 만료된 항목 프루닝
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now > entry.expiresAt) memStore.delete(key);
  }
}, 10 * 60 * 1000);

function checkMemory(
  key: string,
  dailyLimit: number
): { allowed: boolean; remaining: number; limit: number } {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.expiresAt) {
    memStore.set(key, { count: 1, expiresAt: now + 86_400_000 });
    return { allowed: true, remaining: dailyLimit - 1, limit: dailyLimit };
  }

  if (entry.count >= dailyLimit) {
    return { allowed: false, remaining: 0, limit: dailyLimit };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: Math.max(0, dailyLimit - entry.count),
    limit: dailyLimit,
  };
}

// ---------------------------------------------------------------------------
// Redis 기반 (서버리스 인스턴스 간 정확한 카운팅)
// ---------------------------------------------------------------------------

async function checkRedis(
  key: string,
  dailyLimit: number
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const redis = getRedis();
  if (!redis) return checkMemory(key, dailyLimit);

  try {
    const count = await redis.incr(key);

    // 첫 요청일 때 TTL 설정 (24시간)
    if (count === 1) {
      await redis.expire(key, TTL_SEC);
    }

    // TTL 없이 키가 남아있는 경우 안전장치
    if (count > dailyLimit) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        await redis.expire(key, TTL_SEC);
      }
    }

    const remaining = Math.max(0, dailyLimit - count);
    return { allowed: count <= dailyLimit, remaining, limit: dailyLimit };
  } catch (err) {
    console.error("[public-rate-limit] Redis 오류, 인메모리 폴백 사용:", err);
    return checkMemory(key, dailyLimit);
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 비로그인 사용자의 IP 기반 일일 레이트리밋을 확인합니다.
 *
 * @param ip - 클라이언트 IP 주소 (getClientIp() 헬퍼로 추출 권장)
 * @param feature - 제한을 적용할 기능 구분자
 * @param dailyLimit - 하루 최대 허용 요청 수
 * @returns allowed(허용 여부), remaining(남은 횟수), limit(일일 한도)
 */
export async function checkPublicRateLimit(
  ip: string,
  feature: "analyze" | "title" | "seo-check" | "trend" | "demo",
  dailyLimit: number
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `pub-rl:${feature}:${ip}:${date}`;
  return checkRedis(key, dailyLimit);
}

/**
 * Next.js Request 객체에서 클라이언트 IP 주소를 추출합니다.
 * Vercel/프록시 환경의 x-forwarded-for 및 x-real-ip 헤더를 우선 확인합니다.
 *
 * @param request - Next.js Route Handler의 Request 객체
 * @returns 클라이언트 IP 문자열, 판별 불가 시 "unknown"
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
