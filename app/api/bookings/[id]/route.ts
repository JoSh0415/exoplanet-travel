import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError } from "../../../lib/http";
import { updateBookingSchema } from "../../../lib/validators/bookings";
import { validateId } from "../../../lib/validators/common";
import { corsHeaders } from "@/app/lib/cors";
import { getSession } from "../../../lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  // Fetch the booking to check ownership
  const existing = await prisma.booking.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Booking not found");
  }

  if (existing.userId !== session.userId && session.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "You can only modify your own bookings");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid update payload",
      parsed.error.flatten()
    );
  }

  const data: { travelClass?: string; status?: string } = {};
  if (parsed.data.travelClass !== undefined) data.travelClass = parsed.data.travelClass;
  if (parsed.data.status !== undefined) {
    if (session.role !== "ADMIN" && parsed.data.status !== "CANCELLED") {
      return jsonError(403, "FORBIDDEN", "Only admins can change booking status, except for cancellations");
    }
    data.status = parsed.data.status;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data,
    select: {
      id: true,
      bookingDate: true,
      travelClass: true,
      status: true,
      userId: true,
      planetId: true,
    },
  });

  return NextResponse.json(updated, { status: 200, headers: corsHeaders });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  // Fetch the booking to check ownership
  const existing = await prisma.booking.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Booking not found");
  }

  if (existing.userId !== session.userId && session.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "You can only delete your own bookings");
  }

  await prisma.booking.delete({ where: { id } });
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
