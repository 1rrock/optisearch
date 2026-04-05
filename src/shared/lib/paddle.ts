import type { PlanId } from "@/shared/config/constants";

/**
 * Paddle price ID → PlanId mapping.
 * Values come from environment variables set in .env.local
 */
export const PADDLE_PRICE_TO_PLAN: Record<string, PlanId> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? ""]: "basic",
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? ""]: "pro",
};

export function planIdFromPriceId(priceId: string): PlanId | null {
  return PADDLE_PRICE_TO_PLAN[priceId] ?? null;
}

export function priceIdFromPlanId(planId: PlanId): string | null {
  if (planId === "basic") return process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC ?? null;
  if (planId === "pro") return process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? null;
  return null;
}
