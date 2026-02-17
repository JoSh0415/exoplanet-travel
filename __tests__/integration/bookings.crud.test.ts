import request from "supertest";
import { prisma, seedMinimalData } from "../helpers/db";

const BASE = "http://localhost:3000";

test("POST /api/bookings creates a booking (201) and persists to DB", async () => {
  const { planet, user } = await seedMinimalData();

  const payload = {
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  };

  const res = await request(BASE).post("/api/bookings").send(payload);

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty("id");
  expect(res.body).toHaveProperty("userId", user.id);
  expect(res.body).toHaveProperty("planetId", planet.id);
  expect(res.body).toHaveProperty("travelClass", payload.travelClass);
  expect(res.body).toHaveProperty("bookingDate");

  const inDb = await prisma.booking.findUnique({ where: { id: res.body.id } });
  expect(inDb).not.toBeNull();
});

test("POST /api/bookings returns 400 for invalid body (missing fields)", async () => {
  const res = await request(BASE).post("/api/bookings").send({ planetId: "x" });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("POST /api/bookings returns 404 when user or planet does not exist", async () => {
  const fakeId = "c" + "z".repeat(24);

  const res = await request(BASE).post("/api/bookings").send({
    userId: fakeId,
    planetId: fakeId,
    travelClass: "Economy (Cryo-Sleep)",
  });

  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code");
});

test("GET /api/bookings returns paginated list and includes booking fields", async () => {
  const { planet, user } = await seedMinimalData();

  const created = await request(BASE).post("/api/bookings").send({
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  });
  expect(created.status).toBe(201);

  const res = await request(BASE).get("/api/bookings?page=1&pageSize=10");

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("items");
  expect(res.body).toHaveProperty("page", 1);
  expect(res.body).toHaveProperty("pageSize", 10);
  expect(res.body).toHaveProperty("total");
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.total).toBeGreaterThanOrEqual(1);

  const item = res.body.items[0];
  expect(item).toHaveProperty("id");
  expect(item).toHaveProperty("travelClass");
  expect(item).toHaveProperty("bookingDate");

  if (item.user) {
    expect(item.user).toHaveProperty("id", user.id);
    expect(item.user).toHaveProperty("email", user.email);
  }
  if (item.planet) {
    expect(item.planet).toHaveProperty("id", planet.id);
    expect(item.planet).toHaveProperty("name", planet.name);
  }
});

test("GET /api/bookings supports filtering by userId", async () => {
  const { planet, user } = await seedMinimalData();

  await request(BASE).post("/api/bookings").send({
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  });

  const res = await request(BASE).get(`/api/bookings?userId=${user.id}&page=1&pageSize=50`);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("items");
  expect(Array.isArray(res.body.items)).toBe(true);
  expect(res.body.total).toBeGreaterThanOrEqual(1);

  for (const b of res.body.items) {
    if (b.user) {
      expect(b.user.id).toBe(user.id);
    }
  }
});

test("PATCH /api/bookings/{id} updates travelClass (200) and persists", async () => {
  const { planet, user } = await seedMinimalData();

  const created = await request(BASE).post("/api/bookings").send({
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  });

  const bookingId = created.body.id;

  const updated = await request(BASE)
    .patch(`/api/bookings/${bookingId}`)
    .send({ travelClass: "First Class (Warp Drive)" });

  expect(updated.status).toBe(200);
  expect(updated.body).toHaveProperty("id", bookingId);
  expect(updated.body).toHaveProperty("travelClass", "First Class (Warp Drive)");

  const inDb = await prisma.booking.findUnique({ where: { id: bookingId } });
  expect(inDb?.travelClass).toBe("First Class (Warp Drive)");
});

test("PATCH /api/bookings/{id} returns 400 for empty payload", async () => {
  const { planet, user } = await seedMinimalData();

  const created = await request(BASE).post("/api/bookings").send({
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  });

  const bookingId = created.body.id;

  const res = await request(BASE).patch(`/api/bookings/${bookingId}`).send({});

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("DELETE /api/bookings/{id} deletes booking (204) and then returns 404 if repeated", async () => {
  const { planet, user } = await seedMinimalData();

  const created = await request(BASE).post("/api/bookings").send({
    userId: user.id,
    planetId: planet.id,
    travelClass: "Economy (Cryo-Sleep)",
  });

  const bookingId = created.body.id;

  const del1 = await request(BASE).delete(`/api/bookings/${bookingId}`);
  expect(del1.status).toBe(204);

  const inDb = await prisma.booking.findUnique({ where: { id: bookingId } });
  expect(inDb).toBeNull();

  const del2 = await request(BASE).delete(`/api/bookings/${bookingId}`);
  expect(del2.status).toBe(404);
});
