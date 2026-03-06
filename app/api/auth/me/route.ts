import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { user: null },
      { status: 200, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}
