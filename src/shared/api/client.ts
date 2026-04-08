import { useQuotaStore } from "@/shared/stores/quota-store";

export async function apiClient(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  const remaining = response.headers.get("X-Quota-Remaining");
  const limit = response.headers.get("X-Quota-Limit");

  if (remaining !== null && limit !== null) {
    const remainingNum = parseInt(remaining, 10);
    const limitNum = parseInt(limit, 10);

    if (!isNaN(remainingNum) && !isNaN(limitNum)) {
      useQuotaStore.getState().setQuota(limitNum, remainingNum);
    }
  }

  if (response.status === 429) {
    useQuotaStore.getState().openModal();
  }

  return response;
}
