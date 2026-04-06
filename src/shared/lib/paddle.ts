import type { PlanId } from "@/shared/config/constants";

/**
 * Paddle price ID → PlanId mapping.
 * Values come from environment variables set in .env.local
 */
/**
 * Lazy-evaluated price mapping to ensure env vars are available at call time.
 * Uses both NEXT_PUBLIC_ (client) and non-prefixed (server) fallbacks.
 */
function getPriceMap(): Record<string, PlanId> {
  const map: Record<string, PlanId> = {};
  const basicPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? process.env.PADDLE_PRICE_BASIC;
  const proPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? process.env.PADDLE_PRICE_PRO;
  if (basicPrice) map[basicPrice] = "basic";
  if (proPrice) map[proPrice] = "pro";
  return map;
}

export function planIdFromPriceId(priceId: string): PlanId | null {
  return getPriceMap()[priceId] ?? null;
}

export function priceIdFromPlanId(planId: PlanId): string | null {
  if (planId === "basic") return process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? null;
  if (planId === "pro") return process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? null;
  return null;
}
