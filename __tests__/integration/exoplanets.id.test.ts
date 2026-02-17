import request from "supertest";
import { seedMinimalData } from "../helpers/db";

const BASE = "http://localhost:3000";

test("GET /api/exoplanets/{id} returns 200 for an existing exoplanet", async () => {
  const { planet } = await seedMinimalData();

  const res = await request(BASE).get(`/api/exoplanets/${planet.id}`);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("id", planet.id);
  expect(res.body).toHaveProperty("name", planet.name);
  expect(res.body).toHaveProperty("distance");
});

test("GET /api/exoplanets/{id} returns 400 for an invalid id format", async () => {
  const res = await request(BASE).get("/api/exoplanets/bad");

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("GET /api/exoplanets/{id} returns 404 when the exoplanet does not exist", async () => {
  const missingId = "c" + "x".repeat(24);

  const res = await request(BASE).get(`/api/exoplanets/${missingId}`);

  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
});
