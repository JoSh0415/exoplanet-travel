export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodically sweep expired entries to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => this.cleanup(), windowMs * 2);
    // Allow the process to exit without waiting for this timer
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  isRateLimited(ip: string): { limited: boolean; retryAfter: number | null } {
    const now = Date.now();
    const record = this.requests.get(ip);

    if (!record) {
      this.requests.set(ip, { count: 1, resetTime: now + this.windowMs });
      return { limited: false, retryAfter: null };
    }

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.windowMs;
      return { limited: false, retryAfter: null };
    }

    if (record.count >= this.maxRequests) {
      return { limited: true, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
    }

    record.count++;
    return { limited: false, retryAfter: null };
  }

  /** Remove expired entries to bound memory usage. */
  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.requests) {
      if (now > record.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}

// Global instance to persist across HMR in development
const globalForRateLimit = globalThis as unknown as {
  authRateLimiter?: RateLimiter;
};

export const authRateLimiter =
  globalForRateLimit.authRateLimiter || new RateLimiter((process.env.NODE_ENV === "test" || process.env.USE_TEST_DB === "1") ? 100 : 5, 60 * 1000); // 5 requests per minute in dev/prod

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.authRateLimiter = authRateLimiter;
}
