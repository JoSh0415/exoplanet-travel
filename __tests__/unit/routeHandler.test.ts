/**
 * Unit tests for the withErrorHandler route wrapper.
 *
 * Verifies that classified errors are mapped to the correct HTTP
 * status codes and error envelopes, and that unclassified errors
 * never leak stack traces.
 */
import { NextRequest } from "next/server";
import { withErrorHandler } from "../../app/lib/routeHandler";

function fakeReq(method = "GET", path = "/api/test"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), { method });
}

describe("withErrorHandler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes through a successful response unchanged", async () => {
    const handler = withErrorHandler(async () => {
      return Response.json({ ok: true }, { status: 200 });
    });

    const res = await handler(fakeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("maps Prisma P2002 (unique constraint) to 409 CONFLICT", async () => {
    const handler = withErrorHandler(async () => {
      const err: Record<string, unknown> = new Error("Unique constraint");
      err.code = "P2002";
      err.clientVersion = "5.0.0";
      throw err;
    });

    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("maps Prisma P2025 (record not found) to 404 NOT_FOUND", async () => {
    const handler = withErrorHandler(async () => {
      const err: Record<string, unknown> = new Error("Record not found");
      err.code = "P2025";
      err.clientVersion = "5.0.0";
      throw err;
    });

    const res = await handler(fakeReq("DELETE"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("maps other Prisma known errors to 400 DATABASE_ERROR", async () => {
    const handler = withErrorHandler(async () => {
      const err: Record<string, unknown> = new Error("Foreign key");
      err.code = "P2003";
      err.clientVersion = "5.0.0";
      throw err;
    });

    const res = await handler(fakeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("DATABASE_ERROR");
  });

  it("maps PrismaClientValidationError to 400 VALIDATION_ERROR", async () => {
    const handler = withErrorHandler(async () => {
      const err = new Error("Missing field");
      (err as Record<string, unknown>).name = "PrismaClientValidationError";
      throw err;
    });

    const res = await handler(fakeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps JSON SyntaxError to 400 INVALID_JSON", async () => {
    const handler = withErrorHandler(async () => {
      throw new SyntaxError("Unexpected token in JSON at position 0");
    });

    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("maps unknown errors to 500 INTERNAL_ERROR without leaking details", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("SECRET_DB_PASSWORD visible here");
    });

    const res = await handler(fakeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(body)).not.toContain("SECRET_DB_PASSWORD");
  });

  it("logs errors to console.error for server-side observability", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("test-error");
    });

    await handler(fakeReq("GET", "/api/widgets"));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[API Error] GET /api/widgets"),
      expect.any(Error),
    );
  });

  it("forwards context parameter to the handler", async () => {
    const mockContext = { params: Promise.resolve({ id: "abc123" }) };
    const handler = withErrorHandler(async (_req, ctx) => {
      const p = await ctx.params;
      return Response.json({ id: p.id });
    });

    const res = await handler(fakeReq(), mockContext);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "abc123" });
  });
});
