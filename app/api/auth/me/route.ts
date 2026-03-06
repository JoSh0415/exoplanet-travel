import { jsonResponse } from "../../../lib/http";
import { getSession } from "../../../lib/auth";

export async function GET() {
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
}
