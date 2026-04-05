import type { PlanId } from "@/shared/config/constants";

/**
 * Paddle price ID → PlanId mapping.
 * Values come from environment variables set in .env.local
 */
const _map: Record<string, PlanId> = {};
const _basicPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC;
const _proPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO;
if (_basicPrice) _map[_basicPrice] = "basic";
if (_proPrice) _map[_proPrice] = "pro";
export const PADDLE_PRICE_TO_PLAN: Record<string, PlanId> = _map;

export function planIdFromPriceId(priceId: string): PlanId | null {
  return PADDLE_PRICE_TO_PLAN[priceId] ?? null;
}

export function priceIdFromPlanId(planId: PlanId): string | null {
  if (planId === "basic") return process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? null;
  if (planId === "pro") return process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? null;
  return null;
}
