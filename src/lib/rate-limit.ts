/**
 * Redis-ready or lightweight in-memory rate limiter, keyed by IP + route.
 * Enforces strict request budgets (defaulting to 10 requests / minute / IP).
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000); // Default: 1 minute (60,000 ms)
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 10);        // Default: 10 requests

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as { rateLimitBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.rateLimitBuckets ?? (globalForRateLimit.rateLimitBuckets = new Map());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  
  // 1. Redis-based Rate Limiting (Upstash REST API fallback - zero dependencies)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const windowSec = Math.ceil(WINDOW_MS / 1000);
      const response = await fetch(`${upstashUrl.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSec]
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        // Upstash REST pipeline response: [[null, countValue], [null, 1]]
        const count = data[0]?.[1];
        if (typeof count === "number") {
          const allowed = count <= MAX_REQUESTS;
          const remaining = Math.max(0, MAX_REQUESTS - count);
          const resetAt = now + WINDOW_MS;
          return { allowed, remaining, resetAt };
        }
      }
    } catch (error) {
      console.error("Upstash Redis rate limit failed, falling back to local memory:", error);
    }
  }

  // 2. In-Memory Fallback
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  if (bucket.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - bucket.count, resetAt: bucket.resetAt };
}

/** Pull a client identifier from standard proxy headers. */
export function getClientKey(req: Request, routeName: string): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  return `${routeName}:${ip}`;
}
