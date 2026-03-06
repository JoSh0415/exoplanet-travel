import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { bookingsSummaryQuerySchema } from "../../../lib/validators/analytics";
import { jsonError, jsonResponse } from "../../../lib/http";
import { withErrorHandler } from "../../../lib/routeHandler";

import { Prisma } from "@prisma/client";

/**
 * GET /api/analytics/bookings-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|month
 *
 * Returns:
 * - totalBookings in the date range
 * - byTravelClass breakdown
 * - byPeriod breakdown (day or month buckets)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
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

  // Build WHERE clause safely using Prisma.sql
  const conditions = [];

  if (from) {
    conditions.push(Prisma.sql`"bookingDate" >= ${dateFilter.gte!}`);
  }
  if (to) {
    conditions.push(Prisma.sql`"bookingDate" <= ${dateFilter.lte!}`);
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const byPeriodRaw: { period: Date; count: bigint }[] =
    await prisma.$queryRaw(Prisma.sql`
      SELECT date_trunc(${trunc}, "bookingDate") AS period, COUNT("id")::bigint AS count
      FROM "Booking"
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `);

  const byPeriod = byPeriodRaw.map((row) => ({
    period: row.period.toISOString().slice(0, groupBy === "month" ? 7 : 10),
    count: Number(row.count),
  }));

  return jsonResponse(
    { totalBookings, byTravelClass, byPeriod }
  );
});
