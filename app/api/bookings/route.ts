import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { jsonError } from "../../lib/http";
import { createBookingSchema } from "../../lib/validators/bookings";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid booking payload",
      parsed.error.flatten()
    );
  }

  const { userId, planetId, travelClass } = parsed.data;

  const [user, planet] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.exoplanet.findUnique({ where: { id: planetId }, select: { id: true } }),
  ]);

  if (!user) return jsonError(404, "NOT_FOUND", "User not found");
  if (!planet) return jsonError(404, "NOT_FOUND", "Exoplanet not found");

  const booking = await prisma.booking.create({
    data: {
      userId,
      planetId,
      travelClass,
    },
    select: {
      id: true,
      userId: true,
      planetId: true,
      travelClass: true,
      bookingDate: true,
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
