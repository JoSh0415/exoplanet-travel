import request from "supertest";
import { SignJWT } from "jose";

const BASE = "http://localhost:3000";

describe("High-Value Integration Edge Cases", () => {
  describe("Auth Rate Limiting", () => {
    it("should return 429 when max login attempts are exceeded", async () => {
      const email = `ratelimit-${Date.now()}@example.com`;
      const password = "password123";
      
      const payload = { email, password };
      
      let rateLimited = false;
      let lastStatus: number | undefined;

      const proxyIp = `192.168.1.${Math.floor(Math.random() * 255)}`;

      // With TEST limit of 100
      for (let i = 0; i < 110; i++) {
        const res = await request(BASE)
          .post("/api/auth/login")
          .set("x-forwarded-for", proxyIp)
          .send(payload);

        if (res.status === 429) {
          rateLimited = true;
          lastStatus = res.status;
          expect(res.body.error).toHaveProperty("code", "TOO_MANY_REQUESTS");
          expect(res.body.error.details).toHaveProperty("retryAfter");
          break;
        }
      }

      expect(rateLimited).toBe(true);
      expect(lastStatus).toBe(429);
    });

    it("should return 429 when max register attempts are exceeded", async () => {
      const email = `ratelimit2-${Date.now()}@example.com`;
      const proxyIp = `192.168.2.${Math.floor(Math.random() * 255)}`;

      let rateLimited = false;
      let lastStatus: number | undefined;

      for (let i = 0; i < 110; i++) {
        const res = await request(BASE)
          .post("/api/auth/register")
          .set("x-forwarded-for", proxyIp)
          .send({}); // Send invalid payload so it fails fast (400) but still hit rate limits

        if (res.status === 429) {
          rateLimited = true;
          lastStatus = res.status;
          expect(res.body.error.code).toBe("TOO_MANY_REQUESTS");
          break;
        }
      }

      expect(rateLimited).toBe(true);
      expect(lastStatus).toBe(429);
    });
  });

  describe("Malformed and Expired Sessions", () => {
    it("should return UNAUTHORIZED (401) when the cookie contains garbage", async () => {
      const malformedCookie = "exo-session=this.is.garbage.jwt.data;";
      
      const res = await request(BASE)
        .get("/api/bookings") // A protected route
        .set("Cookie", malformedCookie);

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("should gracefully treat the session as null for GET /api/auth/me when token is expired", async () => {
      const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET || "exoplanet-travel-secret-key-change-in-production"
      );
      
      const expiredToken = await new SignJWT({ userId: "123", role: "USER", email: "expired@test.com" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("-1h")
        .sign(JWT_SECRET);

      const expiredCookie = `exo-session=${expiredToken}; HttpOnly`;

      const res = await request(BASE)
        .get("/api/auth/me")
        .set("Cookie", expiredCookie);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull(); // Should treat expired as unauthenticated, not crash
    });
  });
});
