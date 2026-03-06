import { clearSessionCookie } from "../../../lib/auth";
import { jsonResponse } from "../../../lib/http";
import { withErrorHandler } from "../../../lib/routeHandler";

export const POST = withErrorHandler(async () => {
  await clearSessionCookie();

  return jsonResponse(
    { success: true }, { status: 200 }
  );
});
