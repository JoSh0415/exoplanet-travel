import request from "supertest";
import { prisma } from "../helpers/db";

const BASE = "http://localhost:3000";

async function seedPlanetsForListTests() {
  const planets = Array.from({ length: 25 }, (_, i) => {
    const n = i + 1;
    return {
      name: `Test Planet ${n}`,
      distance: n,
      temperature: 300 + n,
      gravity: 1.0,
      vibe: n % 2 === 0 ? "Molten Rock" : "Mysterious",
      discoveryYear: 2000 + n,
    };
  });

  planets.push({
    name: "Gliese Test Planet",
    distance: 100,
    temperature: 280,
    gravity: 1.23,
    vibe: "Habitable Paradise",
    discoveryYear: 2024,
  });

  await prisma.exoplanet.createMany({ data: planets });
}

test("GET /api/exoplanets returns paginated response shape", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?page=1&pageSize=20");

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("items");
  expect(res.body).toHaveProperty("page", 1);
  expect(res.body).toHaveProperty("pageSize", 20);
  expect(res.body).toHaveProperty("total");
  expect(res.body).toHaveProperty("totalPages");
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.items.length).toBeLessThanOrEqual(20);
});

test("GET /api/exoplanets supports pagination deterministically (default sort distance asc)", async () => {
  await seedPlanetsForListTests();

  const page1 = await request(BASE).get("/api/exoplanets?page=1&pageSize=10");
  expect(page1.status).toBe(200);
  expect(page1.body.items).toHaveLength(10);
  expect(page1.body.items[0].distance).toBe(1);
  expect(page1.body.items[9].distance).toBe(10);

  const page2 = await request(BASE).get("/api/exoplanets?page=2&pageSize=10");
  expect(page2.status).toBe(200);
  expect(page2.body.items).toHaveLength(10);
  expect(page2.body.items[0].distance).toBe(11);
  expect(page2.body.items[9].distance).toBe(20);
});

test("GET /api/exoplanets supports case-insensitive q search", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?q=gliese");
  expect(res.status).toBe(200);
  expect(res.body.total).toBeGreaterThanOrEqual(1);

  const names = res.body.items.map((p: { name: string }) => p.name.toLowerCase());
  expect(names.some((n: string) => n.includes("gliese"))).toBe(true);
});

test("GET /api/exoplanets supports vibe filter", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?vibe=Molten%20Rock&pageSize=100");
  expect(res.status).toBe(200);

  // every item should match vibe
  for (const p of res.body.items) {
    expect(p.vibe).toBe("Molten Rock");
  }
});

test("GET /api/exoplanets supports minDistance/maxDistance filter", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?minDistance=0&maxDistance=5&pageSize=100");
  expect(res.status).toBe(200);

  for (const p of res.body.items) {
    expect(p.distance).toBeGreaterThanOrEqual(0);
    expect(p.distance).toBeLessThanOrEqual(5);
  }
});

test("GET /api/exoplanets supports sort=discoveryYear&order=desc", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get(
    "/api/exoplanets?sort=discoveryYear&order=desc&pageSize=5"
  );
  expect(res.status).toBe(200);

  const years = res.body.items.map((p: { discoveryYear: number }) => p.discoveryYear);
  for (let i = 1; i < years.length; i++) {
    expect(years[i]).toBeLessThanOrEqual(years[i - 1]);
  }
});

test("GET /api/exoplanets supports sort=name&order=asc", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?sort=name&order=asc&pageSize=100");
  expect(res.status).toBe(200);

  const names = res.body.items.map((p: { name: string }) => p.name);
  const sorted = [...names].sort((a: string, b: string) => a.localeCompare(b));
  expect(names).toEqual(sorted);
});

test("GET /api/exoplanets returns empty items for page beyond total", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get("/api/exoplanets?page=999&pageSize=10");
  expect(res.status).toBe(200);
  expect(res.body.items).toHaveLength(0);
  expect(res.body.page).toBe(999);
  expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
});

test("GET /api/exoplanets rejects invalid params with 400 + validation error shape", async () => {
  const res = await request(BASE).get("/api/exoplanets?page=-1");
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
});

// ── Combined filter tests ───────────────────────────────────────────

test("GET /api/exoplanets supports combined vibe + distance filters", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get(
    "/api/exoplanets?vibe=Molten%20Rock&minDistance=5&maxDistance=15&pageSize=100"
  );
  expect(res.status).toBe(200);

  for (const p of res.body.items) {
    expect(p.vibe).toBe("Molten Rock");
    expect(p.distance).toBeGreaterThanOrEqual(5);
    expect(p.distance).toBeLessThanOrEqual(15);
  }
  // Verify we actually matched some items (even-numbered planets 6,8,10,12,14)
  expect(res.body.total).toBeGreaterThanOrEqual(1);
});

test("GET /api/exoplanets supports q search + sort + order combined", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get(
    "/api/exoplanets?q=Test%20Planet&sort=discoveryYear&order=desc&pageSize=5"
  );
  expect(res.status).toBe(200);
  expect(res.body.items.length).toBeGreaterThanOrEqual(1);

  // All returned items should match the search term
  for (const p of res.body.items) {
    expect(p.name.toLowerCase()).toContain("test planet");
  }

  // Results should be sorted by discoveryYear descending
  const years = res.body.items.map((p: { discoveryYear: number }) => p.discoveryYear);
  for (let i = 1; i < years.length; i++) {
    expect(years[i]).toBeLessThanOrEqual(years[i - 1]);
  }
});

test("GET /api/exoplanets returns 0 items when combined filters match nothing", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get(
    "/api/exoplanets?vibe=Habitable%20Paradise&maxDistance=1"
  );
  expect(res.status).toBe(200);
  // Habitable Paradise planet is at distance 100, so maxDistance=1 excludes it
  expect(res.body.items).toHaveLength(0);
  expect(res.body.total).toBe(0);
  expect(res.body.totalPages).toBe(1);
});

test("GET /api/exoplanets supports q + vibe + distance + sort combined", async () => {
  await seedPlanetsForListTests();

  const res = await request(BASE).get(
    "/api/exoplanets?q=Test&vibe=Mysterious&minDistance=1&maxDistance=10&sort=distance&order=asc&pageSize=100"
  );
  expect(res.status).toBe(200);

  for (const p of res.body.items) {
    expect(p.name.toLowerCase()).toContain("test");
    expect(p.vibe).toBe("Mysterious");
    expect(p.distance).toBeGreaterThanOrEqual(1);
    expect(p.distance).toBeLessThanOrEqual(10);
  }

  // Results should be sorted by distance ascending
  const distances = res.body.items.map((p: { distance: number }) => p.distance);
  for (let i = 1; i < distances.length; i++) {
    expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
  }
});
