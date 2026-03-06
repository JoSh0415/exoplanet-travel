import { NextRequest } from "next/server";
import { prisma } from "../../../lib/prisma";
import { jsonError, jsonResponse } from "../../../lib/http";
import { loginSchema } from "../../../lib/validators/auth";
import { verifyPassword, setSessionCookie } from "../../../lib/auth";

import { authRateLimiter } from "../../../lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { limited, retryAfter } = authRateLimiter.isRateLimited(ip);
  if (limited) {
    return jsonError(429, "TOO_MANY_REQUESTS", "Too many login attempts. Please try again later.", { retryAfter });
  }

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
      role: true,
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
    role: user.role,
  });

  return jsonResponse(
    { id: user.id, email: user.email, name: user.name, role: user.role }, { status: 200 }
  );
}
