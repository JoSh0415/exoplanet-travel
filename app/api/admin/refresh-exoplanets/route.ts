import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getSession } from "../../../lib/auth";
import { jsonError } from "../../../lib/http";
import { importExoplanets } from "../../../lib/nasaImport";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  if (session.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Admin role required");
  }

  const limit = Number(process.env.REFRESH_PLANET_LIMIT ?? 500);
  const result = await importExoplanets(prisma, { limit });

  if (result.errorMessage) {
    return NextResponse.json(
      {
        message: "Import completed with errors",
        ...result,
      },
      { status: 207, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      message: "Import completed successfully",
      ...result,
    },
    { status: 200, headers: corsHeaders }
  );
}
