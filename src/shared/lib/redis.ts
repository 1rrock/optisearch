/**
 * Upstash Redis client singleton.
 *
 * Uses Vercel KV integration env vars (KV_REST_API_URL / KV_REST_API_TOKEN)
 * which are auto-provisioned when Upstash is connected via Vercel Integrations.
 *
 * Falls back to null if env vars are missing (development without Redis).
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}
