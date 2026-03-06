import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { jsonError } from "../../lib/http";
import { createBookingSchema, listBookingsQuerySchema } from "../../lib/validators/bookings";
import { corsHeaders } from "@/app/lib/cors";
import { getSession } from "../../lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

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

  const { planetId, travelClass } = parsed.data;
  const userId = session.userId;

  const planet = await prisma.exoplanet.findUnique({
    where: { id: planetId },
    select: { id: true },
  });

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
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const url = new URL(req.url);
  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = listBookingsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten());
  }

  const { page, pageSize } = parsed.data;

  // Non-admin users see only their own bookings
  const where: { userId?: string } = {};
  if (session.role !== "ADMIN") {
    where.userId = session.userId;
  }

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