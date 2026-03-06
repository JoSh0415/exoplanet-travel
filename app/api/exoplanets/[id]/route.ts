import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError, jsonResponse } from "../../../lib/http";
import { withErrorHandler } from "../../../lib/routeHandler";
import { validateId } from "../../../lib/validators/common";

export const GET = withErrorHandler(async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid exoplanet id");
  }

  const planet = await prisma.exoplanet.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      distance: true,
      temperature: true,
      gravity: true,
      vibe: true,
      discoveryYear: true,
    },
  });

  if (!planet) {
    return jsonError(404, "NOT_FOUND", "Exoplanet not found");
  }

  return jsonResponse(planet);
});
