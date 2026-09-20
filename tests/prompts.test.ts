import { describe, expect, it } from "vitest";
import { buildContextBlock, buildMessages, generateDemoAnswer, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { DocumentChunk, RetrievedChunk } from "@/types";

function chunk(content: string, name = "Guide.md"): RetrievedChunk {
  const c: DocumentChunk = {
    id: "c1",
    documentId: "d1",
    organizationId: "o1",
    chunkIndex: 0,
    content,
    tokenCount: 10,
    charCount: content.length,
    embedding: [],
    metadata: {},
    createdAt: "",
  };
  return {
    chunk: c,
    score: 0.8,
    documentName: name,
    collectionName: "Engineering",
  };
}

describe("prompt context", () => {
  it("includes system grounding rules", () => {
    expect(SYSTEM_PROMPT).toMatch(/Answer ONLY from the provided context/i);
    expect(SYSTEM_PROMPT).toMatch(/Cite sources/i);
  });

  it("builds numbered context blocks", () => {
    const block = buildContextBlock([chunk("Rollback within 15 minutes.")]);
    expect(block).toContain("[1]");
    expect(block).toContain("Guide.md");
    expect(block).toContain("Rollback within 15 minutes.");
  });

  it("includes history and question in messages", () => {
    const messages = buildMessages({
      question: "How do we rollback?",
      chunks: [chunk("Rollback immediately.")],
      history: [
        {
          id: "1",
          conversationId: "x",
          role: "USER",
          content: "Hi",
          sources: null,
          metadata: null,
          createdAt: "",
        },
      ],
      demoMode: true,
    });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("DEMO");
    expect(messages.at(-1)?.content).toBe("How do we rollback?");
  });

  it("demo answer cites sources and refuses empty context", () => {
    const empty = generateDemoAnswer("Anything?", []);
    expect(empty.confidence).toBe(0);
    expect(empty.answer.toLowerCase()).toContain("could not find");

    const answered = generateDemoAnswer("Rollback?", [
      chunk("Rollback to previous stable release within 15 minutes."),
    ]);
    expect(answered.answer).toContain("[1]");
    expect(answered.confidence).toBeGreaterThan(0);
  });
});
