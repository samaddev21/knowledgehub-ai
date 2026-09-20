import { getSession } from "@/lib/auth/session";
import { assertOrgAccess, assertRole, canManageDocuments, AuthError } from "@/lib/auth/rbac";
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
    const doc = store.getDocument(id);
    if (!doc) throw new AuthError("Document not found", 404);
    assertOrgAccess(session, doc.organizationId);
    const chunks = store.listChunksForDocument(id);
    const collection = store.getCollection(doc.collectionId);
    return jsonOk({
      document: { ...doc, collectionName: collection?.name },
      chunks: chunks.map((c) => ({
        id: c.id,
        chunkIndex: c.chunkIndex,
        content: c.content,
        tokenCount: c.tokenCount,
        charCount: c.charCount,
        metadata: c.metadata,
      })),
    });
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
    if (!canManageDocuments(session)) {
      throw new AuthError("Admin or Owner role required", 403);
    }
    const store = getStore();
    const doc = store.getDocument(id);
    if (!doc) throw new AuthError("Document not found", 404);
    assertOrgAccess(session, doc.organizationId);
    store.deleteDocument(id);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
