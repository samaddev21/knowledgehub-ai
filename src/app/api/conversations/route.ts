import { getSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { handleRouteError, jsonCreated, jsonOk } from "@/lib/api";
import { createConversationSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const conversations = getStore().listConversations(
      session.organization.id,
      session.user.id
    );
    return jsonOk({ conversations, demoMode: session.demoMode });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const body = createConversationSchema.parse(await request.json().catch(() => ({})));
    const conversation = getStore().createConversation(
      session.organization.id,
      session.user.id,
      body.title ?? "New conversation"
    );
    return jsonCreated({ conversation });
  } catch (err) {
    return handleRouteError(err);
  }
}
