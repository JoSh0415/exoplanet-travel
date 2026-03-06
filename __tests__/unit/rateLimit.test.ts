import { RateLimiter } from "../../app/lib/rateLimit";

describe("RateLimiter", () => {
  it("allows the first request from an IP", () => {
    const limiter = new RateLimiter(5, 60_000);
    const result = limiter.isRateLimited("127.0.0.1");
    expect(result).toEqual({ limited: false, retryAfter: null });
  });

  it("allows up to maxRequests requests", () => {
    const limiter = new RateLimiter(3, 60_000);
    const ip = "10.0.0.1";

    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2
    const third = limiter.isRateLimited(ip); // 3 — should still be allowed (count increments after check)

    expect(third.limited).toBe(false);
  });

  it("blocks once maxRequests is exceeded", () => {
    const limiter = new RateLimiter(2, 60_000);
    const ip = "10.0.0.2";

    limiter.isRateLimited(ip); // 1
    limiter.isRateLimited(ip); // 2 — increments to 2
    const blocked = limiter.isRateLimited(ip); // count=2 >= max=2 → blocked

    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("returns retryAfter as a positive number of seconds", () => {
    const limiter = new RateLimiter(1, 30_000);
    const ip = "10.0.0.3";

    limiter.isRateLimited(ip); // 1 — allowed, count now 1
    const blocked = limiter.isRateLimited(ip); // count=1 >= max=1 → blocked

    expect(blocked.limited).toBe(true);
    expect(typeof blocked.retryAfter).toBe("number");
    expect(blocked.retryAfter!).toBeGreaterThan(0);
    expect(blocked.retryAfter!).toBeLessThanOrEqual(30);
  });

  it("tracks different IPs independently", () => {
    const limiter = new RateLimiter(1, 60_000);

    limiter.isRateLimited("A"); // A count=1
    const blockedA = limiter.isRateLimited("A"); // A count=1 >= 1 → blocked
    const allowedB = limiter.isRateLimited("B"); // B first request → allowed

    expect(blockedA.limited).toBe(true);
    expect(allowedB.limited).toBe(false);
  });

  it("resets after window expires", () => {
    const limiter = new RateLimiter(1, 100); // 100ms window
    const ip = "10.0.0.4";

    limiter.isRateLimited(ip); // 1
    const blocked = limiter.isRateLimited(ip); // blocked
    expect(blocked.limited).toBe(true);

    // Simulate window expiry by manipulating the internal state
    // The window is 100ms, so we advance by mocking Date.now
    const originalNow = Date.now;
    Date.now = () => originalNow() + 200; // jump 200ms into the future

    const afterReset = limiter.isRateLimited(ip);
    expect(afterReset.limited).toBe(false);

    Date.now = originalNow; // restore
  });
});
