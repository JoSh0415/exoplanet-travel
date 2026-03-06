import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError } from "../../../lib/http";
import { registerSchema } from "../../../lib/validators/auth";
import { hashPassword, setSessionCookie } from "../../../lib/auth";
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Invalid registration data",
      parsed.error.flatten()
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (existing) {
    return jsonError(409, "EMAIL_EXISTS", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 201, headers: corsHeaders }
  );
}
