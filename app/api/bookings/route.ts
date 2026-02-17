import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { jsonError } from "../../lib/http";
import { createBookingSchema, listBookingsQuerySchema } from "../../lib/validators/bookings";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

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

  return NextResponse.json(booking, { status: 201, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = listBookingsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten());
  }

  const { page, pageSize, userId } = parsed.data;

  const where: { userId?: string } = {};
  if (userId) where.userId = userId;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [total, items] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { bookingDate: "desc" },
      skip,
      take,
      select: {
        id: true,
        bookingDate: true,
        travelClass: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        planet: {
          select: {
            id: true,
            name: true,
            distance: true,
            vibe: true,
            discoveryYear: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages,
  }, { headers: corsHeaders });
}