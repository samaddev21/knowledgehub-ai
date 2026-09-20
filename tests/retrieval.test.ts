import { describe, expect, it } from "vitest";
import { cosineSimilarity, localEmbed } from "@/lib/ai/embeddings";
import { KnowledgeStore } from "@/lib/db/store";
import { retrieveRelevantChunks } from "@/lib/retrieval/search";

describe("retrieval", () => {
  it("embeds deterministically", () => {
    const a = localEmbed("rollback production deployment");
    const b = localEmbed("rollback production deployment");
    expect(a).toEqual(b);
    expect(a.length).toBe(384);
  });

  it("ranks related text higher", () => {
    const q = localEmbed("production rollback policy");
    const related = localEmbed(
      "If a production deployment fails health checks, initiate an immediate rollback."
    );
    const unrelated = localEmbed("Employees receive twenty days of paid time off annually.");
    expect(cosineSimilarity(q, related)).toBeGreaterThan(cosineSimilarity(q, unrelated));
  });

  it("retrieves deployment chunks for rollback questions", async () => {
    const store = new KnowledgeStore();
    store.resetAndSeed();
    // Monkey-patch global store used by retrieval
    const g = globalThis as typeof globalThis & { __knowledgehub_store__?: KnowledgeStore };
    g.__knowledgehub_store__ = store;

    const session = store.getDemoSession();
    const results = await retrieveRelevantChunks({
      organizationId: session.organization.id,
      query: "What is the production rollback policy when health checks fail?",
      topK: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((r) =>
        /rollback|deployment|health/i.test(r.chunk.content + r.documentName)
      )
    ).toBe(true);
  });
});
