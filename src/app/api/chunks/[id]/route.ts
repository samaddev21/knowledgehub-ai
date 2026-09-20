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
    const chunk = store.getChunk(id);
    if (!chunk) throw new AuthError("Chunk not found", 404);
    assertOrgAccess(session, chunk.organizationId);
    const doc = store.getDocument(chunk.documentId);
    const collection = doc ? store.getCollection(doc.collectionId) : null;
    return jsonOk({
      chunk: {
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        charCount: chunk.charCount,
        metadata: chunk.metadata,
        documentId: chunk.documentId,
        documentName: doc?.name ?? chunk.metadata.documentName,
        collectionName: collection?.name ?? chunk.metadata.collectionName,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
