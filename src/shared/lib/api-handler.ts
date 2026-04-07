/**
 * Common API route handler wrapper.
 * Eliminates boilerplate: auth, validation, rate-limit, error handling, logging.
 *
 * Usage:
 *   export const POST = createApiHandler({
 *     schema: z.object({ keyword: z.string().min(1) }),
 *     auth: true,
 *     feature: "search",
 *     handler: async ({ data, user }) => { ... return Response.json(result); }
 *   });
 */

import { type ZodSchema } from "zod";
import { getAuthenticatedUser, enforceUsageLimit, recordUsage } from "./api-helpers";
import type { PlanId } from "@/shared/config/constants";

interface ErrorResponsePayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  init?: ResponseInit
): Response {
  const payload: ErrorResponsePayload = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };

  return Response.json(payload, {
    status,
    ...(init ?? {}),
  });
}

export type AuthenticatedUser = { userId: string; plan: PlanId };

interface ApiHandlerOptions<T> {
  /** Zod schema for request body validation. Omit for GET routes. */
  schema?: ZodSchema<T>;
  /** Require authentication. Default: true */
  auth?: boolean;
  /** Feature name for usage tracking/limits */
  feature?: "search" | "title" | "draft" | "score";
  /** The actual handler function */
  handler: (ctx: HandlerContext<T>) => Promise<Response>;
}

interface HandlerContext<T> {
  /** Parsed & validated request body (if schema provided) */
  data: T;
  /** Authenticated user (if auth: true) */
  user: AuthenticatedUser;
  /** Original request */
  request: Request;
}

/**
 * Create a standardised API route handler with auth, validation, and error handling.
 */
export function createApiHandler<T = unknown>(options: ApiHandlerOptions<T>) {
  const { schema, auth = true, feature, handler } = options;

  return async function apiRoute(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID().slice(0, 8);
    const startTime = Date.now();

    try {
      // 1. Auth check
      let user: AuthenticatedUser = { userId: "", plan: "free" as const };
      if (auth) {
        const authenticatedUser = await getAuthenticatedUser();
        if (!authenticatedUser) {
          return createErrorResponse("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        }
        user = authenticatedUser;

        // Usage limit check
        if (feature) {
          const limitError = await enforceUsageLimit(user.userId, user.plan, feature);
          if (limitError) return limitError;
        }
      }

      // 2. Body parsing & validation (for POST/PUT/PATCH)
      let data = {} as T;
      if (schema) {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return createErrorResponse("INVALID_JSON", "Invalid JSON body", 400);
        }

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return createErrorResponse("VALIDATION_FAILED", "Validation failed", 422, parsed.error.flatten());
        }
        data = parsed.data;
      }

      // 3. Execute handler
      const response = await handler({ data, user, request });

      // 4. Record usage (non-blocking)
      if (auth && feature && user.userId) {
        const keyword = (data && typeof data === "object" && "keyword" in data)
          ? String((data as Record<string, unknown>).keyword)
          : undefined;
        if (keyword) {
          recordUsage(user.userId, feature, keyword).catch((err) => console.error("[api-handler] recordUsage failed:", err));
        }
      }

      // 5. Log summary
      const elapsed = Date.now() - startTime;
      if (elapsed > 5000) {
        console.warn(`[api:${requestId}] Slow request: ${elapsed}ms`);
      }

      return response;
    } catch (err) {
      const elapsed = Date.now() - startTime;
      console.error(`[api:${requestId}] Error after ${elapsed}ms:`, err);
      return createErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
    }
  };
}
