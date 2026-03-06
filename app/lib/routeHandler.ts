import { NextRequest } from "next/server";
import { jsonError } from "./http";

/**
 * Wraps an API route handler with standardised error handling so that
 * unexpected / unhandled errors never leak raw stack‑traces to the client.
 *
 * Classified errors:
 *  - Prisma P2002 (unique constraint)   → 409 CONFLICT
 *  - Prisma P2025 (record not found)    → 404 NOT_FOUND
 *  - Prisma validation                  → 400 VALIDATION_ERROR
 *  - JSON SyntaxError                   → 400 INVALID_JSON
 *  - Everything else                    → 500 INTERNAL_ERROR
 *
 * Usage:
 *   export const GET = withErrorHandler(async (req) => { … });
 */
export function withErrorHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextRequest, context?: any) => Promise<Response> | Response,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      /* ── server‑side log (never sent to client) ─────────────── */
      console.error(
        `[API Error] ${req.method} ${req.nextUrl.pathname}:`,
        error,
      );

      /* ── Prisma known‑request errors ────────────────────────── */
      if (isPrismaKnownRequestError(error)) {
        if (error.code === "P2002") {
          return jsonError(409, "CONFLICT", "Resource already exists");
        }
        if (error.code === "P2025") {
          return jsonError(404, "NOT_FOUND", "Resource not found");
        }
        return jsonError(400, "DATABASE_ERROR", "Invalid database operation");
      }

      /* ── Prisma validation errors ───────────────────────────── */
      if (isPrismaValidationError(error)) {
        return jsonError(400, "VALIDATION_ERROR", "Invalid data provided");
      }

      /* ── Malformed JSON body ────────────────────────────────── */
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return jsonError(400, "INVALID_JSON", "Request body contains invalid JSON");
      }

      /* ── Fallback ───────────────────────────────────────────── */
      return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred");
    }
  };
}

/* ── Prisma error duck‑typing (avoids importing @prisma/client at edge) ── */

function isPrismaKnownRequestError(
  err: unknown,
): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "clientVersion" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

function isPrismaValidationError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as Record<string, unknown>).name === "PrismaClientValidationError"
  );
}
