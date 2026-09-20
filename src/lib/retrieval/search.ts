import { cosineSimilarity, embedText } from "@/lib/ai/embeddings";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/db/store";
import type { RetrievedChunk } from "@/types";

export async function retrieveRelevantChunks(params: {
  organizationId: string;
  query: string;
  collectionId?: string | null;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const topK = params.topK ?? getEnv().RETRIEVAL_TOP_K;
  const { embedding } = await embedText(params.query);
  const store = getStore();

  const candidates = store.listChunksForSearch({
    organizationId: params.organizationId,
    collectionId: params.collectionId,
  });

  const scored: RetrievedChunk[] = candidates.map((item) => ({
    chunk: item.chunk,
    documentName: item.documentName,
    collectionName: item.collectionName,
    score: cosineSimilarity(embedding, item.chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Soft threshold — keep weak matches only if nothing stronger exists
  const filtered = scored.filter((s) => s.score > 0.05);
  return (filtered.length > 0 ? filtered : scored).slice(0, topK);
}

/**
 * Production pgvector SQL (for reference / Postgres adapter):
 *
 * SELECT dc.*, d.name AS document_name, c.name AS collection_name,
 *        1 - (dc.embedding <=> $1::vector) AS score
 * FROM "DocumentChunk" dc
 * JOIN "Document" d ON d.id = dc."documentId"
 * JOIN "Collection" c ON c.id = d."collectionId"
 * WHERE d."organizationId" = $2
 *   AND d.status = 'READY'
 *   AND ($3::text IS NULL OR d."collectionId" = $3)
 * ORDER BY dc.embedding <=> $1::vector
 * LIMIT $4;
 */
