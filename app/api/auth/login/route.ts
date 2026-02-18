import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError } from "../../../lib/http";
import { loginSchema } from "../../../lib/validators/auth";
import { verifyPassword, setSessionCookie } from "../../../lib/auth";
import { corsHeaders } from "@/app/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid login data",
      parsed.error.flatten()
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 200, headers: corsHeaders }
  );
}
