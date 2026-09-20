import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  createCollectionSchema,
  isAllowedUpload,
  searchSchema,
} from "@/lib/validation/schemas";
import { getEnv, isDemoMode, resetEnvCache } from "@/lib/env";

describe("validation", () => {
  it("validates collection creation", () => {
    expect(() => createCollectionSchema.parse({ name: "A" })).toThrow();
    expect(createCollectionSchema.parse({ name: "Legal" }).name).toBe("Legal");
  });

  it("validates chat messages", () => {
    expect(() =>
      chatMessageSchema.parse({ conversationId: "c1", message: "" })
    ).toThrow();
    expect(
      chatMessageSchema.parse({ conversationId: "c1", message: "Hello" }).message
    ).toBe("Hello");
  });

  it("validates search queries", () => {
    expect(searchSchema.parse({ query: "rollback" }).query).toBe("rollback");
  });

  it("allows only supported uploads", () => {
    expect(isAllowedUpload("guide.pdf", "application/pdf")).toBe(true);
    expect(isAllowedUpload("notes.txt", "text/plain")).toBe(true);
    expect(isAllowedUpload("readme.md", "text/markdown")).toBe(true);
    expect(isAllowedUpload("virus.exe", "application/octet-stream")).toBe(false);
  });

  it("loads env with demo defaults", () => {
    resetEnvCache();
    process.env.DEMO_MODE = "true";
    const env = getEnv();
    expect(env.RETRIEVAL_TOP_K).toBeGreaterThan(0);
    expect(isDemoMode()).toBe(true);
  });
});
