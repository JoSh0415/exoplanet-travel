export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowWindow: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowWindow = windowMs;
  }

  isRateLimited(ip: string): { limited: boolean; retryAfter: number | null } {
    const now = Date.now();
    const record = this.requests.get(ip);

    if (!record) {
      this.requests.set(ip, { count: 1, resetTime: now + this.windowWindow });
      return { limited: false, retryAfter: null };
    }

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.windowWindow;
      return { limited: false, retryAfter: null };
    }

    if (record.count >= this.maxRequests) {
      return { limited: true, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
    }

    record.count++;
    return { limited: false, retryAfter: null };
  }
}

// Global instance to persist across HMR in development
const globalForRateLimit = globalThis as unknown as {
  authRateLimiter?: RateLimiter;
};

export const authRateLimiter =
  globalForRateLimit.authRateLimiter || new RateLimiter(process.env.NODE_ENV === "test" ? 1000 : 5, 60 * 1000); // 5 requests per minute in dev/prod

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.authRateLimiter = authRateLimiter;
}
