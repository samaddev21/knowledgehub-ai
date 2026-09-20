import { createHash } from "crypto";
import { getEnv } from "@/lib/env";
import { embedMany } from "@/lib/ai/embeddings";
import { extractText } from "@/lib/ingestion/extract";
import { chunkText } from "@/lib/ingestion/chunk";
import { getStore } from "@/lib/db/store";
import type { Document } from "@/types";

export async function runIngestionPipeline(params: {
  documentId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<Document> {
  const store = getStore();
  const doc = store.getDocument(params.documentId);
  if (!doc) throw new Error("Document not found");

  try {
    store.updateDocument(doc.id, { status: "PROCESSING", errorMessage: null });

    // 1. Extract
    const raw = await extractText(params.buffer, params.filename, params.mimeType);

    // 2. Normalize + Chunk
    const env = getEnv();
    const pieces = chunkText(raw, {
      chunkSize: env.CHUNK_SIZE,
      overlap: env.CHUNK_OVERLAP,
    });

    if (pieces.length === 0) {
      throw new Error("No text content could be extracted from the file");
    }

    // 3. Embed
    const { embeddings } = await embedMany(pieces.map((p) => p.content));

    const collection = store.getCollection(doc.collectionId);
    const hash = createHash("sha256").update(raw).digest("hex");

    // 4. Store
    store.replaceChunks(
      doc.id,
      pieces.map((p, i) => ({
        documentId: doc.id,
        organizationId: doc.organizationId,
        chunkIndex: p.chunkIndex,
        content: p.content,
        tokenCount: p.tokenCount,
        charCount: p.charCount,
        embedding: embeddings[i],
        metadata: {
          documentName: doc.name,
          collectionName: collection?.name,
        },
      }))
    );

    const updated = store.updateDocument(doc.id, {
      status: "READY",
      chunkCount: pieces.length,
      contentHash: hash,
      errorMessage: null,
    })!;

    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    const failed = store.updateDocument(doc.id, {
      status: "FAILED",
      errorMessage: message,
    })!;
    return failed;
  }
}
