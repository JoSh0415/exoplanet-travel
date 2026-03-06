import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../lib/auth";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST() {
  await clearSessionCookie();

  return NextResponse.json(
    { success: true },
    { status: 200, headers: corsHeaders }
  );
}
