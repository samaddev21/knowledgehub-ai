import { createHash } from "crypto";
import { getEnv, hasOpenAI } from "@/lib/env";

export const EMBEDDING_DIMENSIONS = 384;

/**
 * Deterministic local embedding for demo mode.
 * Bag-of-hashed-tokens into a fixed vector, L2-normalized.
 * Not a substitute for OpenAI embeddings in production — clearly labeled.
 */
export function localEmbed(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Float64Array(dimensions);
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    vec[0] = 1;
    return Array.from(vec);
  }

  for (const token of tokens) {
    const h1 = hash32(`${token}:a`);
    const h2 = hash32(`${token}:b`);
    const idx = h1 % dimensions;
    const sign = h2 % 2 === 0 ? 1 : -1;
    const weight = 1 + Math.log1p(token.length);
    vec[idx] += sign * weight;
  }

  // Light character n-gram features for short queries
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const gram = lower.slice(i, i + 3);
    const idx = hash32(gram) % dimensions;
    vec[idx] += 0.15;
  }

  return l2Normalize(Array.from(vec));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hash32(input: string): number {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) >>> 0;
}

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<{
  embedding: number[];
  provider: "demo-local" | "openai";
  model: string;
}> {
  if (!hasOpenAI()) {
    return {
      embedding: localEmbed(text),
      provider: "demo-local",
      model: "local-hash-embedding-v1",
    };
  }

  const env = getEnv();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const res = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return {
    embedding: res.data[0].embedding,
    provider: "openai",
    model: env.OPENAI_EMBEDDING_MODEL,
  };
}

export async function embedMany(texts: string[]): Promise<{
  embeddings: number[][];
  provider: "demo-local" | "openai";
  model: string;
}> {
  if (!hasOpenAI()) {
    return {
      embeddings: texts.map((t) => localEmbed(t)),
      provider: "demo-local",
      model: "local-hash-embedding-v1",
    };
  }

  const env = getEnv();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const res = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });
  const embeddings = res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
  return {
    embeddings,
    provider: "openai",
    model: env.OPENAI_EMBEDDING_MODEL,
  };
}
