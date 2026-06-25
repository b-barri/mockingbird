import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-IP rate limiting for /api/* routes.
//
// Threat model: when the app is public-facing, /api/validate-key becomes
// an Anthropic-key validity oracle, and every proxy route can be flooded
// with bogus invocations to burn Vercel quota. See docs/security-audit.md
// (H1/H2) for full context.
//
// Graceful no-op: if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
// unset, every limiter returns { ok: true }. Local dev and preview deploys
// stay frictionless; production should set both via Vercel's Upstash
// integration.
//
// Fail-open: if Upstash itself errors (network blip, rate-limit on the
// REST API), we let the request through rather than serve a 500. A rate
// limiter taking down the service it protects is worse than the abuse it
// would have stopped during the outage.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const enabled = Boolean(url && token);

const redis = enabled ? new Redis({ url: url!, token: token! }) : null;

// Per-route windows. Sized to the abuse profile, not to the legitimate-use
// profile: a real candidate hits /api/interview maybe 30 times in a 30-min
// session, so 20/min is plenty of headroom while still capping a flood.
//
// /api/validate-key is the strictest because it's the credential-stuffing
// oracle (audit H1) — a real user pastes a key once or twice, never 5x/min.
const BUCKETS = {
  validateKey: { requests: 5, window: "1 m" },
  interview: { requests: 20, window: "1 m" },
  summary: { requests: 10, window: "1 m" },
  // Research fans out to an external fetch + a buffered LLM call. A real user
  // generates a handful of briefs; 8/min caps a flood without friction.
  research: { requests: 8, window: "1 m" },
  voiceTranscribe: { requests: 30, window: "1 m" },
  voiceSynthesize: { requests: 30, window: "1 m" },
  telemetry: { requests: 60, window: "1 m" },
} as const;

export type Bucket = keyof typeof BUCKETS;

const limiters: Partial<Record<Bucket, Ratelimit>> = {};
if (redis) {
  for (const [name, cfg] of Object.entries(BUCKETS)) {
    limiters[name as Bucket] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
      analytics: false,
      ephemeralCache: new Map(),
      prefix: `mockingbird:rl:${name}`,
    });
  }
}

export interface RateLimitOk {
  ok: true;
}
export interface RateLimitDenied {
  ok: false;
  /** Seconds the client should wait before retrying. */
  retryAfter: number;
  /** Limit per window (for X-RateLimit-Limit header). */
  limit: number;
  /** Remaining requests in the current window (always 0 on deny). */
  remaining: number;
}

/**
 * Check whether the request fits inside its per-IP bucket.
 *
 * @returns ok=true to proceed, or ok=false with retryAfter seconds for a 429.
 */
export async function rateLimit(
  request: Request,
  bucket: Bucket
): Promise<RateLimitOk | RateLimitDenied> {
  const limiter = limiters[bucket];
  if (!limiter) return { ok: true };

  const ip = getClientIp(request);

  let result: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    result = await limiter.limit(ip);
  } catch {
    // Fail-open: don't 500 the user because Upstash had a hiccup.
    return { ok: true };
  }

  if (result.success) return { ok: true };

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return {
    ok: false,
    retryAfter,
    limit: result.limit,
    remaining: result.remaining,
  };
}

/**
 * Extract the client IP from common Edge proxy headers. Vercel sets
 * x-forwarded-for; we take the first hop (the original client). Falls
 * back to "anon" so unauthenticated/local requests still get bucketed
 * together rather than bypassing the limiter entirely.
 */
function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "anon";
}
