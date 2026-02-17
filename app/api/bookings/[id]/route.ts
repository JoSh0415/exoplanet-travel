import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError } from "../../../lib/http";
import { updateBookingSchema } from "../../../lib/validators/bookings";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || id.length < 10) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
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
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  try {
    const updated = await prisma.booking.update({
      where: { id },
      data,
      select: {
        id: true,
        bookingDate: true,
        travelClass: true,
        userId: true,
        planetId: true,
      },
    });

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch {
    return jsonError(404, "NOT_FOUND", "Booking not found");
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || id.length < 10) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  try {
    await prisma.booking.delete({ where: { id } });
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  } catch {
    return jsonError(404, "NOT_FOUND", "Booking not found");
  }
}
