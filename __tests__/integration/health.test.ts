import request from "supertest";

const BASE = "http://localhost:3000";

describe("GET /api/health", () => {
  test("returns 200 with status ok when DB is connected", async () => {
    const res = await request(BASE).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("database", "connected");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
    expect(typeof res.body.uptime).toBe("number");
  });

  test("returns valid ISO timestamp", async () => {
    const res = await request(BASE).get("/api/health");

    expect(res.status).toBe(200);
    const ts = new Date(res.body.timestamp);
    expect(ts.toISOString()).toBe(res.body.timestamp);
  });

  test("does not require authentication", async () => {
    // Health should be publicly accessible (no cookies needed)
    const res = await request(BASE).get("/api/health");
    expect(res.status).toBe(200);
  });
});
