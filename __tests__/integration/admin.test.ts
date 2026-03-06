import request from "supertest";
import { prisma, seedMinimalData } from "../helpers/db";

const BASE = "http://localhost:3000";

/** Register a user then return session cookies for authenticated requests */
async function registerAndLogin(
  email: string,
  password: string,
  name: string
): Promise<string[]> {
  const res = await request(BASE)
    .post("/api/auth/register")
    .send({ email, password, name });
  expect(res.status).toBe(201);
  // supertest returns set-cookie as an array
  return res.headers["set-cookie"] ?? [];
}

/** Promote a user to ADMIN directly in the database */
async function promoteToAdmin(email: string) {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role: "ADMIN" },
  });
}

// ── POST /api/admin/refresh-exoplanets ──────────────────────────────

describe("POST /api/admin/refresh-exoplanets", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await request(BASE).post("/api/admin/refresh-exoplanets");
    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
  });

  test("returns 403 for non-admin user", async () => {
    const email = `user-${Date.now()}@example.com`;
    const cookies = await registerAndLogin(email, "securePass123", "Regular User");

    const res = await request(BASE)
      .post("/api/admin/refresh-exoplanets")
      .set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });

  test("returns 200 and creates DataImportRun for admin", async () => {
    const email = `admin-${Date.now()}@example.com`;
    const cookies = await registerAndLogin(email, "securePass123", "Admin User");
    await promoteToAdmin(email);

    // Re-login to get a fresh token with ADMIN role
    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email, password: "securePass123" });
    expect(loginRes.status).toBe(200);
    const adminCookies = loginRes.headers["set-cookie"] as string[];
    expect(adminCookies).toBeDefined();

    const res = await request(BASE)
      .post("/api/admin/refresh-exoplanets")
      .set("Cookie", adminCookies.join("; "));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("insertedCount");
    expect(res.body).toHaveProperty("updatedCount");
    expect(res.body).toHaveProperty("retrievedAt");

    // Verify DataImportRun was persisted
    const runs = await prisma.dataImportRun.findMany();
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs[0]).toHaveProperty("sourceName", "NASA Exoplanet Archive");
  }, 60_000); // NASA TAP can be slow
});

// ── GET /api/admin/import-runs ──────────────────────────────────────

describe("GET /api/admin/import-runs", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await request(BASE).get("/api/admin/import-runs");
    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
  });

  test("returns 403 for non-admin user", async () => {
    const email = `user2-${Date.now()}@example.com`;
    const cookies = await registerAndLogin(email, "securePass123", "Regular User 2");

    const res = await request(BASE)
      .get("/api/admin/import-runs")
      .set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });

  test("returns paginated import runs for admin", async () => {
    const email = `admin2-${Date.now()}@example.com`;
    const cookies = await registerAndLogin(email, "securePass123", "Admin User 2");
    await promoteToAdmin(email);

    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email, password: "securePass123" });
    expect(loginRes.status).toBe(200);
    const adminCookies = loginRes.headers["set-cookie"] as string[];
    expect(adminCookies).toBeDefined();

    // Seed an import run directly
    await prisma.dataImportRun.create({
      data: {
        sourceName: "test",
        tapQuery: "select 1",
        retrievedAt: new Date(),
        insertedCount: 5,
        updatedCount: 0,
      },
    });

    const res = await request(BASE)
      .get("/api/admin/import-runs?page=1&pageSize=10")
      .set("Cookie", adminCookies.join("; "));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});
