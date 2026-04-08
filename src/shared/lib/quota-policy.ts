import type { PlanId } from "@/shared/config/constants";
import { checkQuota, type QuotaTier } from "@/lib/quota";
import { createErrorResponse } from "@/shared/lib/api-handler";

const PLAN_TO_TIER: Record<PlanId, QuotaTier> = {
  free: "FREE",
  basic: "PRO",
  pro: "ENTERPRISE",
};

export interface QuotaPolicySuccess {
  allowed: true;
  remaining: number;
  used: number;
  limit: number;
  resetAt: string;
  tier: QuotaTier;
}

export interface QuotaPolicyDenied {
  allowed: false;
  response: Response;
}

export async function enforceQuotaPolicy(userId: string, plan: PlanId): Promise<QuotaPolicySuccess | QuotaPolicyDenied> {
  const tier = PLAN_TO_TIER[plan] ?? "FREE";
  const quota = await checkQuota(userId, tier);

  if (!quota.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000)
    );

    return {
      allowed: false,
      response: createErrorResponse(
        "QUOTA_EXCEEDED",
        "요금제 할당량을 초과했습니다. 잠시 후 다시 시도하거나 상위 플랜으로 업그레이드해주세요.",
        429,
        {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          resetAt: quota.resetAt,
          tier: quota.tier,
        },
        {
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-Quota-Limit": String(quota.limit),
            "X-Quota-Remaining": String(quota.remaining),
            "X-Quota-Reset": quota.resetAt,
            "X-Quota-Tier": quota.tier,
          },
        }
      ),
    };
  }

  return {
    allowed: true,
    remaining: quota.remaining,
    used: quota.used,
    limit: quota.limit,
    resetAt: quota.resetAt,
    tier: quota.tier,
  };
}
