import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError } from "../../../lib/http";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || id.length < 10) {
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

  return NextResponse.json(planet, { headers: corsHeaders });
}
