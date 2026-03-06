import { NextResponse } from "next/server";
import { corsHeaders } from "./cors";

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status, headers: corsHeaders }
  );
}

export function jsonResponse(data: unknown, responseInit?: ResponseInit) {
  const init = responseInit || {};
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init.headers,
    },
  });
}
