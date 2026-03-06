import { prisma } from "../../lib/prisma";
import { jsonResponse } from "../../lib/http";
import { withErrorHandler } from "../../lib/routeHandler";

/**
 * GET /api/health
 * Liveness / readiness probe — checks DB connectivity and reports uptime.
 */
export const GET = withErrorHandler(async () => {
  let database: "connected" | "disconnected" = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    /* DB unreachable — report but don't crash */
  }

  const status = database === "connected" ? "ok" : "degraded";
  const code = status === "ok" ? 200 : 503;

  return jsonResponse(
    {
      status,
      timestamp: new Date().toISOString(),
      database,
      uptime: process.uptime(),
    },
    { status: code }
  );
});
