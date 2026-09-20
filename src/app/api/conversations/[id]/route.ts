import { getSession } from "@/lib/auth/session";
import { assertOrgAccess, assertRole, AuthError } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { handleRouteError, jsonOk } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    assertRole(session, "MEMBER");
    const store = getStore();
    const conversation = store.getConversation(id);
    if (!conversation) throw new AuthError("Conversation not found", 404);
    assertOrgAccess(session, conversation.organizationId);
    if (conversation.userId !== session.user.id) {
      throw new AuthError("Conversation not found", 404);
    }
    const messages = store.listMessages(id);
    return jsonOk({ conversation, messages, demoMode: session.demoMode });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();
    assertRole(session, "MEMBER");
    const store = getStore();
    const conversation = store.getConversation(id);
    if (!conversation) throw new AuthError("Conversation not found", 404);
    assertOrgAccess(session, conversation.organizationId);
    if (conversation.userId !== session.user.id) {
      throw new AuthError("Conversation not found", 404);
    }
    store.deleteConversation(id);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
