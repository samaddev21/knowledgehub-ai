import { getSession } from "@/lib/auth/session";
import { assertRole, AuthError } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { searchSchema } from "@/lib/validation/schemas";
import { retrieveRelevantChunks } from "@/lib/retrieval/search";
import { handleRouteError, jsonOk } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const body = searchSchema.parse(await request.json());

    if (body.collectionId) {
      const col = getStore().getCollection(body.collectionId);
      if (!col || col.organizationId !== session.organization.id) {
        throw new AuthError("Collection not found", 404);
      }
    }

    const chunks = await retrieveRelevantChunks({
      organizationId: session.organization.id,
      query: body.query,
      collectionId: body.collectionId,
      topK: body.topK,
    });

    return jsonOk({
      demoMode: session.demoMode,
      results: chunks.map((c, i) => ({
        rank: i + 1,
        score: Number(c.score.toFixed(4)),
        chunkId: c.chunk.id,
        documentId: c.chunk.documentId,
        documentName: c.documentName,
        collectionName: c.collectionName,
        chunkIndex: c.chunk.chunkIndex,
        content: c.chunk.content,
        tokenCount: c.chunk.tokenCount,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
