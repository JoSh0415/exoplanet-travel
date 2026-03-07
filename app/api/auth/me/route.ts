import { jsonResponse } from "../../../lib/http";
import { getSession } from "../../../lib/auth";
import { withErrorHandler } from "../../../lib/routeHandler";

export const GET = withErrorHandler(async () => {
  const session = await getSession();

  if (!session) {
    return jsonResponse(
      { user: null }, { status: 200 }
    );
  }

  return jsonResponse(
    {
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    }, { status: 200 }
  );
});
