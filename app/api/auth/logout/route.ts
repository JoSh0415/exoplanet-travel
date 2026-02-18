import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../lib/auth";
import { corsHeaders } from "@/app/lib/cors";

export async function POST() {
  await clearSessionCookie();

  return NextResponse.json(
    { success: true },
    { status: 200, headers: corsHeaders }
  );
}
