import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { bookingsSummaryQuerySchema } from "../../../lib/validators/analytics";
import { jsonError } from "../../../lib/http";
import { corsHeaders } from "@/app/lib/cors";
import { Prisma } from "@prisma/client";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/analytics/bookings-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|month
 *
 * Returns:
 * - totalBookings in the date range
 * - byTravelClass breakdown
 * - byPeriod breakdown (day or month buckets)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = bookingsSummaryQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.flatten()
    );
  }

  const { from, to, groupBy } = parsed.data;

  // Build a bookingDate filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

  const where: Prisma.BookingWhereInput = {};
  if (from || to) {
    where.bookingDate = dateFilter;
  }

  // Total bookings
  const totalBookings = await prisma.booking.count({ where });

  // Bookings by travel class
  const byClassRaw = await prisma.booking.groupBy({
    by: ["travelClass"],
    _count: { id: true },
    where,
    orderBy: { _count: { id: "desc" } },
  });

  const byTravelClass = byClassRaw.map((row) => ({
    travelClass: row.travelClass,
    count: row._count.id,
  }));

  // Bookings by period (day or month) using raw SQL for date truncation
  const trunc = groupBy === "month" ? "month" : "day";

  // Build WHERE clause for raw query
  const conditions: string[] = [];
  const params: (Date | string)[] = [];
  let paramIdx = 1;

  if (from) {
    conditions.push(`"bookingDate" >= $${paramIdx}`);
    params.push(dateFilter.gte!);
    paramIdx++;
  }
  if (to) {
    conditions.push(`"bookingDate" <= $${paramIdx}`);
    params.push(dateFilter.lte!);
    paramIdx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const byPeriodRaw: { period: Date; count: bigint }[] =
    await prisma.$queryRawUnsafe(
      `SELECT date_trunc('${trunc}', "bookingDate") AS period, COUNT("id")::bigint AS count
       FROM "Booking"
       ${whereClause}
       GROUP BY period
       ORDER BY period ASC`,
      ...params
    );

  const byPeriod = byPeriodRaw.map((row) => ({
    period: row.period.toISOString().slice(0, groupBy === "month" ? 7 : 10),
    count: Number(row.count),
  }));

  return NextResponse.json(
    { totalBookings, byTravelClass, byPeriod },
    { headers: corsHeaders }
  );
}
