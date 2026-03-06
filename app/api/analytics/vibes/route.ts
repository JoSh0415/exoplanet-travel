import { jsonResponse } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/analytics/vibes
 *
 * Returns the count of exoplanets per vibe category,
 * plus optional top-booked vibes (vibes ordered by booking count).
 */
export async function GET() {
  // Count exoplanets per vibe using groupBy
  const vibeCounts = await prisma.exoplanet.groupBy({
    by: ["vibe"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const vibes = vibeCounts.map((v) => ({
    vibe: v.vibe ?? "Unknown",
    count: v._count.id,
  }));

  // Top booked vibes: count bookings joined to planet vibe
  // Prisma doesn't support groupBy on relations, so use raw SQL
  const topBookedVibes: { vibe: string; bookings: bigint }[] = await prisma.$queryRaw`
    SELECT e."vibe" AS vibe, COUNT(b."id")::bigint AS bookings
    FROM "Booking" b
    JOIN "Exoplanet" e ON e."id" = b."planetId"
    WHERE e."vibe" IS NOT NULL
    GROUP BY e."vibe"
    ORDER BY bookings DESC
  `;

  const topBooked = topBookedVibes.map((row) => ({
    vibe: row.vibe,
    bookings: Number(row.bookings),
  }));

  return jsonResponse({ vibes, topBooked });
}
