type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as { __ulmcRate?: Map<string, Bucket> };
const buckets = globalForLimiter.__ulmcRate ?? (globalForLimiter.__ulmcRate = new Map());

/**
 * In-memory fixed-window limiter for unauthenticated write endpoints.
 * Adequate for a single Node process; a shared store is required for
 * multi-instance deployments (documented in docs/ARCHITECTURE.md).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
