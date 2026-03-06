import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/auth";
import { jsonError, jsonResponse } from "../../../lib/http";
import { importRunsQuerySchema } from "../../../lib/validators/admin";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  if (session.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Admin role required");
  }

  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = importRunsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.flatten()
    );
  }

  const { page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [total, items] = await prisma.$transaction([
    prisma.dataImportRun.count(),
    prisma.dataImportRun.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return jsonResponse(
    { items, page, pageSize, total, totalPages }
  );
}
