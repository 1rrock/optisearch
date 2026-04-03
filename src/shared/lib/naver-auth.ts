/**
 * Shared Naver API authentication headers.
 * Used by both Search API and DataLab API.
 */

export function getNaverAuthHeaders(): HeadersInit {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Naver API credentials: NAVER_CLIENT_ID and NAVER_CLIENT_SECRET must be set"
    );
  }

  return {
    "Content-Type": "application/json",
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  };
}
