import request from "supertest";

const BASE = "http://localhost:3000";

test("API is reachable", async () => {
  const res = await request(BASE).get("/api/exoplanets?page=1&pageSize=1");
  expect([200, 400]).toContain(res.status);
});
