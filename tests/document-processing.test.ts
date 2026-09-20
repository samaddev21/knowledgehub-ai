import { describe, expect, it } from "vitest";
import { extractText } from "@/lib/ingestion/extract";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { KnowledgeStore } from "@/lib/db/store";
import { createHash } from "crypto";

describe("document processing", () => {
  it("extracts plaintext and markdown", async () => {
    const txt = await extractText(
      Buffer.from("Hello Acme policies."),
      "note.txt",
      "text/plain"
    );
    expect(txt).toContain("Hello Acme");

    const md = await extractText(
      Buffer.from("# Title\n\n**Bold** policy text."),
      "policy.md",
      "text/markdown"
    );
    expect(md).toContain("Title");
    expect(md).toContain("Bold");
  });

  it("runs ingestion to READY with chunks and embeddings", async () => {
    const store = new KnowledgeStore();
    store.resetAndSeed();
    const g = globalThis as typeof globalThis & { __knowledgehub_store__?: KnowledgeStore };
    g.__knowledgehub_store__ = store;

    const session = store.getDemoSession();
    const collections = store.listCollections(session.organization.id);
    const doc = store.createDocumentRecord({
      organizationId: session.organization.id,
      collectionId: collections[0].id,
      uploadedById: session.user.id,
      name: "custom-policy.txt",
      mimeType: "text/plain",
      fileSize: 100,
    });

    const content =
      "Custom Acme policy: all production changes require a change request and a documented rollback plan before deployment.";
    const result = await runIngestionPipeline({
      documentId: doc.id,
      buffer: Buffer.from(content),
      filename: "custom-policy.txt",
      mimeType: "text/plain",
    });

    expect(result.status).toBe("READY");
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(result.contentHash).toBe(createHash("sha256").update(content).digest("hex"));
    const chunks = store.listChunksForDocument(doc.id);
    expect(chunks[0].embedding.length).toBeGreaterThan(10);
  });
});
