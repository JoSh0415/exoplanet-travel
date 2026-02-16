import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { exoplanetsQuerySchema } from "../../lib/validators/exoplanets";
import { jsonError } from "../../lib/http";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const queryObj = Object.fromEntries(url.searchParams.entries());

  const parsed = exoplanetsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten());
  }

  const { page, pageSize, q, vibe, minDistance, maxDistance, sort, order } =
    parsed.data;

  const where: any = {};

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  if (vibe) {
    where.vibe = { equals: vibe, mode: "insensitive" };
  }

  if (minDistance != null || maxDistance != null) {
    where.distance = {};
    if (minDistance != null) where.distance.gte = minDistance;
    if (maxDistance != null) where.distance.lte = maxDistance;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [total, items] = await prisma.$transaction([
    prisma.exoplanet.count({ where }),
    prisma.exoplanet.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take,
      select: {
        id: true,
        name: true,
        distance: true,
        temperature: true,
        gravity: true,
        vibe: true,
        discoveryYear: true,
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
