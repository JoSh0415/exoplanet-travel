import request from "supertest";
import { prisma, seedMinimalData } from "../helpers/db";

const BASE = "http://localhost:3000";

// ── Helpers ─────────────────────────────────────────────────────────────

/** Seed two planets with different vibes, a user, and two bookings */
async function seedAnalyticsData() {
  const planetA = await prisma.exoplanet.create({
    data: {
      name: `Analytics Planet A ${Date.now()}`,
      distance: 10.5,
      temperature: 300,
      gravity: 1.0,
      vibe: "Habitable Paradise",
      discoveryYear: 2020,
    },
  });

  const planetB = await prisma.exoplanet.create({
    data: {
      name: `Analytics Planet B ${Date.now()}`,
      distance: 42.0,
      temperature: 1500,
      gravity: 3.5,
      vibe: "Literal Hellscape",
      discoveryYear: 2018,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `analytics-${Date.now()}@example.com`,
      name: "Analytics User",
      passwordHash:
        "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWX12",
    },
  });

  // 3 bookings to planetA, 1 to planetB
  await prisma.booking.createMany({
    data: [
      { userId: user.id, planetId: planetA.id, travelClass: "Economy (Cryo-Sleep)" },
      { userId: user.id, planetId: planetA.id, travelClass: "Economy (Cryo-Sleep)" },
      { userId: user.id, planetId: planetA.id, travelClass: "First Class (Warp Drive)" },
      { userId: user.id, planetId: planetB.id, travelClass: "First Class (Warp Drive)" },
    ],
  });

  return { planetA, planetB, user };
}

// ── GET /api/analytics/vibes ────────────────────────────────────────

describe("GET /api/analytics/vibes", () => {
  test("returns vibe counts with correct shape", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/vibes");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("vibes");
    expect(res.body).toHaveProperty("topBooked");
    expect(Array.isArray(res.body.vibes)).toBe(true);
    expect(Array.isArray(res.body.topBooked)).toBe(true);

    // Each vibe entry has { vibe, count }
    for (const v of res.body.vibes) {
      expect(v).toHaveProperty("vibe");
      expect(v).toHaveProperty("count");
      expect(typeof v.count).toBe("number");
    }

    // topBooked entries have { vibe, bookings }
    for (const tb of res.body.topBooked) {
      expect(tb).toHaveProperty("vibe");
      expect(tb).toHaveProperty("bookings");
      expect(typeof tb.bookings).toBe("number");
    }
  });

  test("includes expected vibes from seeded data", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/vibes");
    expect(res.status).toBe(200);

    const vibeNames = res.body.vibes.map((v: { vibe: string }) => v.vibe);
    expect(vibeNames).toContain("Habitable Paradise");
    expect(vibeNames).toContain("Literal Hellscape");
  });
});

// ── GET /api/analytics/top-destinations ─────────────────────────────

describe("GET /api/analytics/top-destinations", () => {
  test("returns destinations with correct shape", async () => {
    const { planetA } = await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/top-destinations?limit=5");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("destinations");
    expect(Array.isArray(res.body.destinations)).toBe(true);

    for (const dest of res.body.destinations) {
      expect(dest).toHaveProperty("planetId");
      expect(dest).toHaveProperty("name");
      expect(dest).toHaveProperty("distance");
      expect(dest).toHaveProperty("vibe");
      expect(dest).toHaveProperty("bookings");
      expect(typeof dest.bookings).toBe("number");
    }

    // planetA should be the top destination (3 bookings vs 1)
    expect(res.body.destinations[0].name).toBe(planetA.name);
    expect(res.body.destinations[0].bookings).toBe(3);
  });

  test("respects limit parameter", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/top-destinations?limit=1");

    expect(res.status).toBe(200);
    expect(res.body.destinations.length).toBe(1);
  });

  test("returns 400 for invalid limit", async () => {
    const res = await request(BASE).get("/api/analytics/top-destinations?limit=abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
  });
});

// ── GET /api/analytics/bookings-summary ─────────────────────────────

describe("GET /api/analytics/bookings-summary", () => {
  test("returns summary with correct shape (no date filter)", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/bookings-summary");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalBookings");
    expect(res.body).toHaveProperty("byTravelClass");
    expect(res.body).toHaveProperty("byPeriod");

    expect(typeof res.body.totalBookings).toBe("number");
    expect(res.body.totalBookings).toBeGreaterThanOrEqual(4);

    expect(Array.isArray(res.body.byTravelClass)).toBe(true);
    for (const tc of res.body.byTravelClass) {
      expect(tc).toHaveProperty("travelClass");
      expect(tc).toHaveProperty("count");
    }

    expect(Array.isArray(res.body.byPeriod)).toBe(true);
    for (const p of res.body.byPeriod) {
      expect(p).toHaveProperty("period");
      expect(p).toHaveProperty("count");
    }
  });

  test("filters by date range", async () => {
    await seedAnalyticsData();

    // Use a far-future range that won't contain any bookings
    const res = await request(BASE).get(
      "/api/analytics/bookings-summary?from=2099-01-01&to=2099-12-31"
    );

    expect(res.status).toBe(200);
    expect(res.body.totalBookings).toBe(0);
    expect(res.body.byTravelClass).toEqual([]);
    expect(res.body.byPeriod).toEqual([]);
  });

  test("groups by month when requested", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get(
      "/api/analytics/bookings-summary?groupBy=month"
    );

    expect(res.status).toBe(200);
    // Period strings should be YYYY-MM format when groupBy=month
    for (const p of res.body.byPeriod) {
      expect(p.period).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  test("defaults to day grouping with YYYY-MM-DD periods", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/bookings-summary");

    expect(res.status).toBe(200);
    for (const p of res.body.byPeriod) {
      expect(p.period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("returns 400 for invalid date format", async () => {
    const res = await request(BASE).get(
      "/api/analytics/bookings-summary?from=not-a-date"
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
  });

  test("returns correct travel-class breakdown", async () => {
    await seedAnalyticsData();

    const res = await request(BASE).get("/api/analytics/bookings-summary");
    expect(res.status).toBe(200);

    const classMap = new Map(
      res.body.byTravelClass.map((tc: { travelClass: string; count: number }) => [
        tc.travelClass,
        tc.count,
      ])
    );

    // We seeded 2 Economy + 2 First Class (across the 4 bookings)
    expect(classMap.get("Economy (Cryo-Sleep)")).toBeGreaterThanOrEqual(2);
    expect(classMap.get("First Class (Warp Drive)")).toBeGreaterThanOrEqual(2);
  });
});
