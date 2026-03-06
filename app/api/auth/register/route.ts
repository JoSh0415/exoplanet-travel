import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError, jsonResponse } from "../../../lib/http";
import { registerSchema } from "../../../lib/validators/auth";
import { hashPassword, setSessionCookie } from "../../../lib/auth";

import { authRateLimiter } from "../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { limited, retryAfter } = authRateLimiter.isRateLimited(ip);
  if (limited) {
    return jsonError(429, "TOO_MANY_REQUESTS", "Too many registration attempts. Please try again later.", { retryAfter });
  }

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
      role: true,
    },
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return jsonResponse(
    { id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 }
  );
}
