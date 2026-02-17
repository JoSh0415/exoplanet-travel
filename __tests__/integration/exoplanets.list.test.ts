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

test("GET /api/exoplanets rejects invalid params with 400 + validation error shape", async () => {
  const res = await request(BASE).get("/api/exoplanets?page=-1");
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
});
