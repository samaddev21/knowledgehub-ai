import { describe, expect, it } from "vitest";
import { chunkText, normalizeText } from "@/lib/ingestion/chunk";

describe("chunking", () => {
  it("normalizes whitespace", () => {
    expect(normalizeText("a\r\n\r\n\r\nb\t\tc")).toContain("a");
    expect(normalizeText("a\r\n\r\n\r\nb")).toBe("a\n\nb");
  });

  it("splits long text into overlapping chunks", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about deployments and policies.`).join(" ");
    const chunks = chunkText(text, { chunkSize: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks.every((c) => c.charCount > 0)).toBe(true);
    expect(chunks.every((c) => c.tokenCount >= 1)).toBe(true);
  });

  it("returns empty for blank input", () => {
    expect(chunkText("   ")).toEqual([]);
  });
});
