import jwt from "jsonwebtoken";

export interface AnalysisTokenPayload {
  userId: string;
  keyword: string;
  feature: string;
  type: "analysisToken";
  iat?: number;
  exp?: number;
}

/**
 * Sign a short-lived JWT for authorizing analysis requests.
 * Returns null if AUTH_SECRET is not configured.
 */
export function signAnalysisToken(payload: {
  userId: string;
  keyword: string;
  feature: string;
}): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[analysis-token] AUTH_SECRET is not set");
    return null;
  }

  return jwt.sign(
    { userId: payload.userId, keyword: payload.keyword, feature: payload.feature, type: "analysisToken" },
    secret,
    { expiresIn: "120s" }
  );
}

/**
 * Verify an analysis JWT and match userId, keyword, and feature claims.
 * Returns the payload on success, null on any failure.
 */
export function verifyAnalysisToken(
  token: string,
  userId: string,
  keyword: string,
  feature: string
): AnalysisTokenPayload | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[analysis-token] AUTH_SECRET is not set");
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret, { clockTolerance: 5 }) as AnalysisTokenPayload;

    if (
      decoded.type !== "analysisToken" ||
      decoded.userId !== userId ||
      decoded.keyword !== keyword ||
      decoded.feature !== feature
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
