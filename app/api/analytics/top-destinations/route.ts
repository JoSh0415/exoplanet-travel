import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { topDestinationsQuerySchema } from "../../../lib/validators/analytics";
import { jsonError } from "../../../lib/http";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/analytics/top-destinations?limit=10
 *
 * Returns the top planets by booking count, including planet name, distance, and vibe.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = topDestinationsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.flatten()
    );
  }

  const { limit } = parsed.data;

  // Group bookings by planetId, count, then fetch planet details
  const grouped = await prisma.booking.groupBy({
    by: ["planetId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) {
    return NextResponse.json({ destinations: [] }, { headers: corsHeaders });
  }

  // Fetch planet details for the top planets
  const planetIds = grouped.map((g) => g.planetId);
  const planets = await prisma.exoplanet.findMany({
    where: { id: { in: planetIds } },
    select: { id: true, name: true, distance: true, vibe: true },
  });

  const planetMap = new Map(planets.map((p) => [p.id, p]));

  const destinations = grouped.map((g) => {
    const planet = planetMap.get(g.planetId);
    return {
      planetId: g.planetId,
      name: planet?.name ?? "Unknown",
      distance: planet?.distance ?? null,
      vibe: planet?.vibe ?? null,
      bookings: g._count.id,
    };
  });

  return NextResponse.json({ destinations }, { headers: corsHeaders });
}
