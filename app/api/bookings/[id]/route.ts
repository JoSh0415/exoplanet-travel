import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError, jsonResponse } from "../../../lib/http";
import { updateBookingSchema } from "../../../lib/validators/bookings";
import { validateId } from "../../../lib/validators/common";
import { withErrorHandler } from "../../../lib/routeHandler";
import { getSession } from "../../../lib/auth";
import { corsHeaders } from "../../../lib/cors";

async function verifyBookingAccess(id: string, session: { userId: string; role: string }, action: string) {
  const existing = await prisma.booking.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return { error: jsonError(404, "NOT_FOUND", "Booking not found") };
  }

  if (existing.userId !== session.userId && session.role !== "ADMIN") {
    return { error: jsonError(403, "FORBIDDEN", `You can only ${action} your own bookings`) };
  }

  return { existing };
}

export const GET = withErrorHandler(async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      bookingDate: true,
      travelClass: true,
      status: true,
      userId: true,
      planetId: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      planet: {
        select: { id: true, name: true, distance: true, vibe: true, discoveryYear: true },
      },
    },
  });

  if (!booking) {
    return jsonError(404, "NOT_FOUND", "Booking not found");
  }

  if (booking.userId !== session.userId && session.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "You can only view your own bookings");
  }

  return jsonResponse(booking, { status: 200 });
});

export const PATCH = withErrorHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  const access = await verifyBookingAccess(id, session, "modify");
  if (access.error) return access.error;

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

  return jsonResponse(updated, { status: 200 });
});

export const DELETE = withErrorHandler(async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = await context.params;

  const idCheck = validateId(id);
  if (!idCheck.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  const access = await verifyBookingAccess(id, session, "delete");
  if (access.error) return access.error;

  await prisma.booking.delete({ where: { id } });
  return new NextResponse(null, { status: 204, headers: corsHeaders });
});
