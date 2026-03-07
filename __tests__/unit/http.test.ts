import { jsonError, jsonResponse } from "../../app/lib/http";

describe("jsonError", () => {
  it("returns the correct status code", () => {
    const res = jsonError(404, "NOT_FOUND", "Resource missing");
    expect(res.status).toBe(404);
  });

  it("returns JSON envelope with code, message", async () => {
    const res = jsonError(400, "VALIDATION_ERROR", "Bad input");
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Bad input",
      },
    });
  });

  it("includes details when provided", async () => {
    const details = { field: "email", issue: "required" };
    const res = jsonError(422, "VALIDATION_ERROR", "Missing field", details);
    const body = await res.json();
    expect(body.error.details).toEqual(details);
  });

  it("omits details key from JSON when undefined", async () => {
    const res = jsonError(500, "INTERNAL_ERROR", "Boom");
    const text = await res.clone().text();
    expect(text).not.toContain('"details"');
  });

  it("includes CORS headers", () => {
    const res = jsonError(403, "FORBIDDEN", "Nope");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });
});

describe("jsonResponse", () => {
  it("returns 200 by default", () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
  });

  it("returns the provided data as JSON", async () => {
    const data = { items: [1, 2, 3], total: 3 };
    const res = jsonResponse(data);
    const body = await res.json();
    expect(body).toEqual(data);
  });

  it("respects custom status in responseInit", () => {
    const res = jsonResponse({ created: true }, { status: 201 });
    expect(res.status).toBe(201);
  });

  it("includes CORS headers", () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(res.headers.get("access-control-allow-headers")).toContain("Content-Type");
  });

  it("merges custom headers with CORS headers", () => {
    const res = jsonResponse(
      { ok: true },
      { headers: { "X-Custom": "hello" } }
    );
    expect(res.headers.get("X-Custom")).toBe("hello");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
