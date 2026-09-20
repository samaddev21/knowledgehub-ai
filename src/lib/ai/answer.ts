import { getEnv, hasOpenAI, isDemoMode } from "@/lib/env";
import { buildMessages, generateDemoAnswer } from "@/lib/ai/prompts";
import type { CitationSource, Message, RetrievedChunk } from "@/types";

export interface AnswerResult {
  answer: string;
  sources: CitationSource[];
  confidence: number;
  coverage: number;
  mode: "demo" | "openai";
  model: string;
}

export function toSources(chunks: RetrievedChunk[]): CitationSource[] {
  return chunks.map((c, i) => ({
    index: i + 1,
    chunkId: c.chunk.id,
    documentId: c.chunk.documentId,
    documentName: c.documentName,
    collectionName: c.collectionName,
    chunkIndex: c.chunk.chunkIndex,
    content: c.chunk.content,
    score: Number(c.score.toFixed(4)),
  }));
}

export async function generateAnswer(params: {
  question: string;
  chunks: RetrievedChunk[];
  history: Message[];
}): Promise<AnswerResult> {
  const sources = toSources(params.chunks);

  if (!hasOpenAI() || isDemoMode()) {
    const demo = generateDemoAnswer(params.question, params.chunks);
    return {
      answer: demo.answer,
      sources,
      confidence: demo.confidence,
      coverage: demo.coverage,
      mode: "demo",
      model: "demo-extractive-rag",
    };
  }

  const env = getEnv();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const messages = buildMessages({
    question: params.question,
    chunks: params.chunks,
    history: params.history,
    demoMode: false,
  });

  const completion = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    temperature: 0.2,
    messages,
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ||
    "I was unable to generate an answer from the retrieved context.";

  const avg =
    params.chunks.length === 0
      ? 0
      : params.chunks.reduce((s, c) => s + c.score, 0) / params.chunks.length;

  return {
    answer,
    sources,
    confidence: Number(Math.max(0, Math.min(1, avg)).toFixed(2)),
    coverage: Number(
      Math.max(0, Math.min(1, params.chunks.length / getEnv().RETRIEVAL_TOP_K)).toFixed(2)
    ),
    mode: "openai",
    model: env.OPENAI_CHAT_MODEL,
  };
}

/** Streaming variant — yields text deltas then a final metadata event. */
export async function* streamAnswer(params: {
  question: string;
  chunks: RetrievedChunk[];
  history: Message[];
}): AsyncGenerator<
  | { type: "token"; content: string }
  | { type: "done"; result: AnswerResult }
> {
  if (!hasOpenAI() || isDemoMode()) {
    const result = await generateAnswer(params);
    // Simulate streaming for polished UI in demo mode
    const words = result.answer.split(/(\s+)/);
    for (const w of words) {
      yield { type: "token", content: w };
      await new Promise((r) => setTimeout(r, 8));
    }
    yield { type: "done", result };
    return;
  }

  const env = getEnv();
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const messages = buildMessages({
    question: params.question,
    chunks: params.chunks,
    history: params.history,
    demoMode: false,
  });

  const stream = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    temperature: 0.2,
    messages,
    stream: true,
  });

  let full = "";
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) {
      full += delta;
      yield { type: "token", content: delta };
    }
  }

  const sources = toSources(params.chunks);
  const avg =
    params.chunks.length === 0
      ? 0
      : params.chunks.reduce((s, c) => s + c.score, 0) / params.chunks.length;

  yield {
    type: "done",
    result: {
      answer: full.trim(),
      sources,
      confidence: Number(Math.max(0, Math.min(1, avg)).toFixed(2)),
      coverage: Number(
        Math.max(0, Math.min(1, params.chunks.length / env.RETRIEVAL_TOP_K)).toFixed(2)
      ),
      mode: "openai",
      model: env.OPENAI_CHAT_MODEL,
    },
  };
}
