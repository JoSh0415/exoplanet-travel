import request from "supertest";

const BASE = "http://localhost:3000";

/** Generate a unique email to avoid collisions across test runs */
function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// ── Register ────────────────────────────────────────────────────────────────

test("POST /api/auth/register creates a new user (201) and persists to DB", async () => {
  const email = uniqueEmail("newuser");
  const payload = {
    email,
    password: "securePass123",
    name: "New User",
  };

  const res = await request(BASE).post("/api/auth/register").send(payload);

  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty("id");
  expect(res.body).toHaveProperty("email", email.toLowerCase());
  expect(res.body).toHaveProperty("name", "New User");
  expect(res.body).not.toHaveProperty("passwordHash");
});

test("POST /api/auth/register returns 400 for invalid body (missing fields)", async () => {
  const res = await request(BASE).post("/api/auth/register").send({ email: uniqueEmail("bad") });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("POST /api/auth/register returns 400 for short password", async () => {
  const res = await request(BASE).post("/api/auth/register").send({
    email: uniqueEmail("short"),
    password: "abc",
    name: "Short Pass",
  });

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("POST /api/auth/register returns 409 for duplicate email", async () => {
  const email = uniqueEmail("dupe");
  const payload = {
    email,
    password: "securePass123",
    name: "First User",
  };

  const first = await request(BASE).post("/api/auth/register").send(payload);
  expect(first.status).toBe(201);

  const second = await request(BASE).post("/api/auth/register").send({
    ...payload,
    name: "Second User",
  });

  expect(second.status).toBe(409);
  expect(second.body).toHaveProperty("error");
  expect(second.body.error).toHaveProperty("code", "EMAIL_EXISTS");
});

test("POST /api/auth/register lowercases email", async () => {
  const tag = `UPPER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await request(BASE).post("/api/auth/register").send({
    email: `${tag}@Example.COM`,
    password: "securePass123",
    name: "Upper Case",
  });

  expect(res.status).toBe(201);
  expect(res.body.email).toBe(`${tag.toLowerCase()}@example.com`);
});

// ── Login ───────────────────────────────────────────────────────────────────

test("POST /api/auth/login returns 200 with user data for valid credentials", async () => {
  const email = uniqueEmail("login");
  const password = "securePass123";

  await request(BASE).post("/api/auth/register").send({
    email,
    password,
    name: "Login User",
  });

  const res = await request(BASE).post("/api/auth/login").send({ email, password });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("id");
  expect(res.body).toHaveProperty("email", email);
  expect(res.body).toHaveProperty("name", "Login User");
  expect(res.body).not.toHaveProperty("passwordHash");
});

test("POST /api/auth/login sets session cookie", async () => {
  const email = uniqueEmail("cookie");
  const password = "securePass123";

  await request(BASE).post("/api/auth/register").send({
    email,
    password,
    name: "Cookie User",
  });

  const res = await request(BASE).post("/api/auth/login").send({ email, password });

  expect(res.status).toBe(200);
  expect(res.headers["set-cookie"]).toBeDefined();
  const cookies = res.headers["set-cookie"];
  const sessionCookie = Array.isArray(cookies)
    ? cookies.find((c: string) => c.includes("exo-session"))
    : typeof cookies === "string" && cookies.includes("exo-session")
      ? cookies
      : undefined;
  expect(sessionCookie).toBeDefined();
});

test("POST /api/auth/login returns 400 for invalid body", async () => {
  const res = await request(BASE).post("/api/auth/login").send({});

  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
});

test("POST /api/auth/login returns 401 for non-existent email", async () => {
  const res = await request(BASE).post("/api/auth/login").send({
    email: uniqueEmail("nobody"),
    password: "securePass123",
  });

  expect(res.status).toBe(401);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "INVALID_CREDENTIALS");
});

test("POST /api/auth/login returns 401 for wrong password", async () => {
  const email = uniqueEmail("wrongpw");

  await request(BASE).post("/api/auth/register").send({
    email,
    password: "correctPassword1",
    name: "Wrong PW User",
  });

  const res = await request(BASE).post("/api/auth/login").send({
    email,
    password: "wrongPassword99",
  });

  expect(res.status).toBe(401);
  expect(res.body).toHaveProperty("error");
  expect(res.body.error).toHaveProperty("code", "INVALID_CREDENTIALS");
});

// ── Me ──────────────────────────────────────────────────────────────────────

test("GET /api/auth/me returns { user: null } without session cookie", async () => {
  const res = await request(BASE).get("/api/auth/me");

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("user", null);
});

test("GET /api/auth/me returns user when session cookie is present", async () => {
  const email = uniqueEmail("me");
  const password = "securePass123";

  await request(BASE).post("/api/auth/register").send({
    email,
    password,
    name: "Me User",
  });

  const loginRes = await request(BASE).post("/api/auth/login").send({ email, password });
  const cookies = loginRes.headers["set-cookie"];

  const res = await request(BASE)
    .get("/api/auth/me")
    .set("Cookie", cookies);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("user");
  expect(res.body.user).toHaveProperty("id");
  expect(res.body.user).toHaveProperty("email", email);
  expect(res.body.user).toHaveProperty("name", "Me User");
});

// ── Logout ──────────────────────────────────────────────────────────────────

test("POST /api/auth/logout returns 200 with success: true", async () => {
  const res = await request(BASE).post("/api/auth/logout");

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("success", true);
});

test("POST /api/auth/logout clears session cookie", async () => {
  const email = uniqueEmail("logout");
  const password = "securePass123";

  await request(BASE).post("/api/auth/register").send({
    email,
    password,
    name: "Logout User",
  });

  const loginRes = await request(BASE).post("/api/auth/login").send({ email, password });
  const loginCookies = loginRes.headers["set-cookie"];

  const logoutRes = await request(BASE)
    .post("/api/auth/logout")
    .set("Cookie", loginCookies);

  expect(logoutRes.status).toBe(200);

  // After logout, /me should return null user
  const clearedCookies = logoutRes.headers["set-cookie"] ?? [];
  const meRes = await request(BASE)
    .get("/api/auth/me")
    .set("Cookie", clearedCookies as unknown as string[]);

  expect(meRes.body).toHaveProperty("user", null);
});

// ── Full flow ───────────────────────────────────────────────────────────────

test("register → login → me → logout → me returns null (full auth flow)", async () => {
  const email = uniqueEmail("flow");
  const password = "securePass123";
  const name = "Flow User";

  // Register
  const regRes = await request(BASE).post("/api/auth/register").send({ email, password, name });
  expect(regRes.status).toBe(201);

  // Login
  const loginRes = await request(BASE).post("/api/auth/login").send({ email, password });
  expect(loginRes.status).toBe(200);
  const cookies = loginRes.headers["set-cookie"];

  // Me (authenticated)
  const meRes = await request(BASE).get("/api/auth/me").set("Cookie", cookies);
  expect(meRes.status).toBe(200);
  expect(meRes.body.user).toHaveProperty("email", email);
  expect(meRes.body.user).toHaveProperty("name", name);

  // Logout
  const logoutRes = await request(BASE).post("/api/auth/logout").set("Cookie", cookies);
  expect(logoutRes.status).toBe(200);

  // Me (after logout)
  const clearedCookies = logoutRes.headers["set-cookie"] ?? [];
  const meAfter = await request(BASE)
    .get("/api/auth/me")
    .set("Cookie", clearedCookies as unknown as string[]);
  expect(meAfter.body).toHaveProperty("user", null);
});
