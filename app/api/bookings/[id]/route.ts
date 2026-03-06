import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError, jsonResponse } from "../../../lib/http";
import { updateBookingSchema } from "../../../lib/validators/bookings";
import { validateId } from "../../../lib/validators/common";

import { getSession } from "../../../lib/auth";

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

  const access = await verifyBookingAccess(id, session, "delete");
  if (access.error) return access.error;

  await prisma.booking.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
