/**
 * In-memory sliding-window rate limiter.
 *
 * Keyed counters live in a module-level Map, so each Next.js server
 * instance has its own view. Fine for single-region MVP traffic; swap
 * to Upstash / Redis when scaling horizontally.
 *
 * TODO(upstash): replace the Map with an Upstash Redis client call so
 * limits hold across Vercel edge regions and serverless cold starts.
 */
import type { NextRequest } from "next/server";

type Bucket = number[]; // array of request timestamps (ms)
const buckets: Map<string, Bucket> = new Map();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = buckets.get(key) ?? [];
  // Prune old entries lazily.
  const fresh = existing.filter((t) => t > cutoff);
  if (fresh.length >= limit) {
    const oldest = fresh[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(key, fresh);
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return { allowed: true, remaining: limit - fresh.length, retryAfterSec: 0 };
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xreal = req.headers.get("x-real-ip");
  if (xreal) return xreal.trim();
  return "unknown";
}
