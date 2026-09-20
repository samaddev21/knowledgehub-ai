import { getSession } from "@/lib/auth/session";
import { canAskQuestions } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { handleRouteError, jsonOk } from "@/lib/api";
import { AuthError } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const session = await getSession();
    if (!canAskQuestions(session)) {
      throw new AuthError("Insufficient permissions", 403);
    }
    const stats = getStore().getDashboard(session.organization.id);
    return jsonOk({
      ...stats,
      organization: session.organization,
      user: session.user,
      role: session.membership.role,
      demoMode: session.demoMode,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
