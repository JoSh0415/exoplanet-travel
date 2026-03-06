import { clearSessionCookie } from "../../../lib/auth";
import { jsonResponse } from "../../../lib/http";

export async function POST() {
  await clearSessionCookie();

  return jsonResponse(
    { success: true }, { status: 200 }
  );
}
