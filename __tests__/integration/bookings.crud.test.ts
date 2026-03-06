import request from "supertest";
import { prisma, seedMinimalData } from "../helpers/db";

const BASE = "http://localhost:3000";

// ── Auth helpers ────────────────────────────────────────────────────

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Register a user via the API and return session cookies */
async function registerAndLogin(
  email: string,
  password: string,
  name: string
): Promise<string[]> {
  const res = await request(BASE)
    .post("/api/auth/register")
    .send({ email, password, name });
  expect(res.status).toBe(201);
  const raw = res.headers["set-cookie"];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

/** Promote a user to ADMIN directly in the database */
async function promoteToAdmin(email: string) {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role: "ADMIN" },
  });
}

// ── POST /api/bookings ─────────────────────────────────────────────

describe("POST /api/bookings", () => {
  test("returns 401 when unauthenticated", async () => {
    const { planet } = await seedMinimalData();

    const res = await request(BASE).post("/api/bookings").send({
      planetId: planet.id,
      travelClass: "Economy (Cryo-Sleep)",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("creates a booking (201) using session user", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("poster");
    const cookies = await registerAndLogin(email, "securePass123", "Poster");

    const res = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({
        planetId: planet.id,
        travelClass: "Economy (Cryo-Sleep)",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("userId");
    expect(res.body).toHaveProperty("planetId", planet.id);
    expect(res.body).toHaveProperty("travelClass", "Economy (Cryo-Sleep)");
    expect(res.body).toHaveProperty("bookingDate");

    // Verify userId matches the logged-in user
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(res.body.userId).toBe(user!.id);

    // Verify persisted
    const inDb = await prisma.booking.findUnique({ where: { id: res.body.id } });
    expect(inDb).not.toBeNull();
  });

  test("returns 400 for invalid body (missing fields)", async () => {
    const email = uniqueEmail("bad-body");
    const cookies = await registerAndLogin(email, "securePass123", "BadBody");

    const res = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ travelClass: "X" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 404 when planet does not exist", async () => {
    const email = uniqueEmail("no-planet");
    const cookies = await registerAndLogin(email, "securePass123", "NoPlanet");
    const fakeId = "c" + "z".repeat(24);

    const res = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: fakeId, travelClass: "Economy (Cryo-Sleep)" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

// ── GET /api/bookings ───────────────────────────────────────────────

describe("GET /api/bookings", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await request(BASE).get("/api/bookings");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("returns only current user's bookings for non-admin", async () => {
    const { planet } = await seedMinimalData();

    // Create two users, each with a booking
    const emailA = uniqueEmail("userA");
    const cookiesA = await registerAndLogin(emailA, "securePass123", "User A");
    await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookiesA.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });

    const emailB = uniqueEmail("userB");
    const cookiesB = await registerAndLogin(emailB, "securePass123", "User B");
    await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookiesB.join("; "))
      .send({ planetId: planet.id, travelClass: "First Class (Warp Drive)" });

    // User A should only see their own booking
    const res = await request(BASE)
      .get("/api/bookings")
      .set("Cookie", cookiesA.join("; "));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    const userA = await prisma.user.findUnique({ where: { email: emailA.toLowerCase() } });
    for (const item of res.body.items) {
      expect(item.user.id).toBe(userA!.id);
    }
  });

  test("admin sees all bookings", async () => {
    const { planet } = await seedMinimalData();

    // Create a regular user with a booking
    const emailReg = uniqueEmail("regular");
    const cookiesReg = await registerAndLogin(emailReg, "securePass123", "Regular");
    await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookiesReg.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });

    // Create an admin user
    const emailAdmin = uniqueEmail("admin-list");
    await registerAndLogin(emailAdmin, "securePass123", "Admin List");
    await promoteToAdmin(emailAdmin);

    // Re-login to get fresh token with ADMIN role
    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email: emailAdmin, password: "securePass123" });
    const rawCookies = loginRes.headers["set-cookie"];
    const adminCookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

    const res = await request(BASE)
      .get("/api/bookings")
      .set("Cookie", adminCookies.join("; "));

    expect(res.status).toBe(200);
    // Admin should see at least the regular user's booking
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

// ── GET /api/bookings/{id} ──────────────────────────────────────────

describe("GET /api/bookings/{id}", () => {
  test("returns 401 when unauthenticated", async () => {
    const fakeId = "c" + "z".repeat(24);
    const res = await request(BASE).get(`/api/bookings/${fakeId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("owner can view their own booking (200)", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("get-owner");
    const cookies = await registerAndLogin(email, "securePass123", "GetOwner");

    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const res = await request(BASE)
      .get(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", created.body.id);
    expect(res.body).toHaveProperty("travelClass", "Economy (Cryo-Sleep)");
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("planet");
    expect(res.body.planet).toHaveProperty("name");
  });

  test("returns 403 when non-owner tries to view", async () => {
    const { planet } = await seedMinimalData();

    const emailOwner = uniqueEmail("get-owner2");
    const ownerCookies = await registerAndLogin(emailOwner, "securePass123", "OwnerView");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", ownerCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const emailOther = uniqueEmail("get-other");
    const otherCookies = await registerAndLogin(emailOther, "securePass123", "OtherView");

    const res = await request(BASE)
      .get(`/api/bookings/${created.body.id}`)
      .set("Cookie", otherCookies.join("; "));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("admin can view any booking", async () => {
    const { planet } = await seedMinimalData();

    const emailReg = uniqueEmail("get-reg");
    const regCookies = await registerAndLogin(emailReg, "securePass123", "GetReg");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", regCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const emailAdmin = uniqueEmail("get-admin");
    await registerAndLogin(emailAdmin, "securePass123", "GetAdmin");
    await promoteToAdmin(emailAdmin);
    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email: emailAdmin, password: "securePass123" });
    const rawCookies = loginRes.headers["set-cookie"];
    const adminCookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

    const res = await request(BASE)
      .get(`/api/bookings/${created.body.id}`)
      .set("Cookie", adminCookies.join("; "));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", created.body.id);
  }, 15_000);

  test("returns 404 when booking does not exist", async () => {
    const email = uniqueEmail("get-404");
    const cookies = await registerAndLogin(email, "securePass123", "Get404");
    const fakeId = "c" + "z".repeat(24);

    const res = await request(BASE)
      .get(`/api/bookings/${fakeId}`)
      .set("Cookie", cookies.join("; "));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("returns 400 for invalid id format", async () => {
    const email = uniqueEmail("get-bad-id");
    const cookies = await registerAndLogin(email, "securePass123", "GetBadId");

    const res = await request(BASE)
      .get("/api/bookings/not-a-valid-id")
      .set("Cookie", cookies.join("; "));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ── PATCH /api/bookings/{id} ────────────────────────────────────────

describe("PATCH /api/bookings/{id}", () => {
  test("returns 401 when unauthenticated", async () => {
    const fakeId = "c" + "z".repeat(24);
    const res = await request(BASE)
      .patch(`/api/bookings/${fakeId}`)
      .send({ travelClass: "First Class (Warp Drive)" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("owner can update their own booking (200)", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("patcher");
    const cookies = await registerAndLogin(email, "securePass123", "Patcher");

    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const updated = await request(BASE)
      .patch(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "))
      .send({ travelClass: "First Class (Warp Drive)" });

    expect(updated.status).toBe(200);
    expect(updated.body.travelClass).toBe("First Class (Warp Drive)");

    const inDb = await prisma.booking.findUnique({ where: { id: created.body.id } });
    expect(inDb?.travelClass).toBe("First Class (Warp Drive)");
  });

  test("returns 403 when non-owner tries to update", async () => {
    const { planet } = await seedMinimalData();

    // Owner creates booking
    const emailOwner = uniqueEmail("patch-owner");
    const ownerCookies = await registerAndLogin(emailOwner, "securePass123", "Owner");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", ownerCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    // Other user tries to update
    const emailOther = uniqueEmail("patch-other");
    const otherCookies = await registerAndLogin(emailOther, "securePass123", "Other");

    const res = await request(BASE)
      .patch(`/api/bookings/${created.body.id}`)
      .set("Cookie", otherCookies.join("; "))
      .send({ travelClass: "First Class (Warp Drive)" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("admin can update any booking", async () => {
    const { planet } = await seedMinimalData();

    // Regular user creates booking
    const emailReg = uniqueEmail("patch-reg");
    const regCookies = await registerAndLogin(emailReg, "securePass123", "Reg");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", regCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    // Admin updates it
    const emailAdmin = uniqueEmail("patch-admin");
    await registerAndLogin(emailAdmin, "securePass123", "PatchAdmin");
    await promoteToAdmin(emailAdmin);
    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email: emailAdmin, password: "securePass123" });
    const rawCookies2 = loginRes.headers["set-cookie"];
    const adminCookies = Array.isArray(rawCookies2) ? rawCookies2 : rawCookies2 ? [rawCookies2] : [];

    const res = await request(BASE)
      .patch(`/api/bookings/${created.body.id}`)
      .set("Cookie", adminCookies.join("; "))
      .send({ travelClass: "First Class (Warp Drive)" });

    expect(res.status).toBe(200);
    expect(res.body.travelClass).toBe("First Class (Warp Drive)");
  }, 15_000);

  test("returns 400 for empty payload", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("patch-empty");
    const cookies = await registerAndLogin(email, "securePass123", "PatchEmpty");

    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });

    const res = await request(BASE)
      .patch(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ── DELETE /api/bookings/{id} ───────────────────────────────────────

describe("DELETE /api/bookings/{id}", () => {
  test("returns 401 when unauthenticated", async () => {
    const fakeId = "c" + "z".repeat(24);
    const res = await request(BASE).delete(`/api/bookings/${fakeId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("owner can delete their own booking (204)", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("deleter");
    const cookies = await registerAndLogin(email, "securePass123", "Deleter");

    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const del = await request(BASE)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "));
    expect(del.status).toBe(204);

    const inDb = await prisma.booking.findUnique({ where: { id: created.body.id } });
    expect(inDb).toBeNull();
  }, 15_000);

  test("returns 403 when non-owner tries to delete", async () => {
    const { planet } = await seedMinimalData();

    const emailOwner = uniqueEmail("del-owner");
    const ownerCookies = await registerAndLogin(emailOwner, "securePass123", "DelOwner");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", ownerCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const emailOther = uniqueEmail("del-other");
    const otherCookies = await registerAndLogin(emailOther, "securePass123", "DelOther");

    const res = await request(BASE)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Cookie", otherCookies.join("; "));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("admin can delete any booking", async () => {
    const { planet } = await seedMinimalData();

    const emailReg = uniqueEmail("del-reg");
    const regCookies = await registerAndLogin(emailReg, "securePass123", "DelReg");
    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", regCookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const emailAdmin = uniqueEmail("del-admin");
    await registerAndLogin(emailAdmin, "securePass123", "DelAdmin");
    await promoteToAdmin(emailAdmin);
    const loginRes = await request(BASE)
      .post("/api/auth/login")
      .send({ email: emailAdmin, password: "securePass123" });
    const rawCookies3 = loginRes.headers["set-cookie"];
    const adminCookies = Array.isArray(rawCookies3) ? rawCookies3 : rawCookies3 ? [rawCookies3] : [];

    const res = await request(BASE)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Cookie", adminCookies.join("; "));

    expect(res.status).toBe(204);
  });

  test("returns 404 when deleting again", async () => {
    const { planet } = await seedMinimalData();
    const email = uniqueEmail("del-again");
    const cookies = await registerAndLogin(email, "securePass123", "DelAgain");

    const created = await request(BASE)
      .post("/api/bookings")
      .set("Cookie", cookies.join("; "))
      .send({ planetId: planet.id, travelClass: "Economy (Cryo-Sleep)" });
    expect(created.status).toBe(201);

    const del1 = await request(BASE)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "));
    expect(del1.status).toBe(204);

    const del2 = await request(BASE)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Cookie", cookies.join("; "));
    expect(del2.status).toBe(404);
  });
});
