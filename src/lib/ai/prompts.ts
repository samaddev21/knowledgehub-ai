import type { Message, RetrievedChunk } from "@/types";

export const SYSTEM_PROMPT = `You are KnowledgeHub AI, an internal enterprise knowledge assistant.

Strict rules:
1. Answer ONLY from the provided context chunks.
2. Do NOT invent company policies, procedures, numbers, or facts.
3. If the information is not available in the context, say so clearly.
4. Cite sources using bracket markers like [1], [2] that match the provided source indices.
5. Keep answers concise but useful for busy employees.
6. Prefer bullet points for multi-step procedures.
7. Never claim that external AI services were used when operating in demo mode.`;

export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant context was retrieved.";
  }
  return chunks
    .map((c, i) => {
      const idx = i + 1;
      return `[${idx}] ${c.documentName} (${c.collectionName})\n${c.chunk.content}`;
    })
    .join("\n\n---\n\n");
}

export function buildMessages(params: {
  question: string;
  chunks: RetrievedChunk[];
  history: Message[];
  demoMode: boolean;
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const context = buildContextBlock(params.chunks);
  const modeNote = params.demoMode
    ? "\n\nOperating mode: DEMO. Use only provided context. Do not claim live model calls."
    : "";

  const system = {
    role: "system" as const,
    content: `${SYSTEM_PROMPT}${modeNote}\n\nContext:\n${context}`,
  };

  const historyMessages = params.history
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .slice(-6)
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

  return [
    system,
    ...historyMessages,
    { role: "user" as const, content: params.question },
  ];
}

/**
 * Demo-mode extractive answerer — synthesizes from retrieved chunks only.
 * Explicitly does not call external AI services.
 */
export function generateDemoAnswer(
  question: string,
  chunks: RetrievedChunk[]
): {
  answer: string;
  confidence: number;
  coverage: number;
} {
  if (chunks.length === 0) {
    return {
      answer:
        "I could not find relevant information in your organization's knowledge base for this question. Try rephrasing, or upload related documentation.",
      confidence: 0,
      coverage: 0,
    };
  }

  const top = chunks.slice(0, 3);
  const avgScore =
    top.reduce((s, c) => s + c.score, 0) / Math.max(top.length, 1);
  const confidence = Math.max(0, Math.min(1, (avgScore + 0.15) * 0.9));
  const coverage = Math.max(0, Math.min(1, top.length / 3));

  const q = question.toLowerCase();
  const isHowTo = /\b(how|steps|process|procedure|deploy|incident)\b/.test(q);
  const isWhat = /\b(what|define|policy|who|when)\b/.test(q);

  const lines: string[] = [];
  lines.push(
    isHowTo
      ? "Based on the retrieved internal documentation:"
      : isWhat
        ? "Here is what the knowledge base says:"
        : "From the available company documents:"
  );
  lines.push("");

  for (let i = 0; i < top.length; i++) {
    const c = top[i];
    const excerpt = pickSentences(c.chunk.content, 2);
    lines.push(`${excerpt} [${i + 1}]`);
  }

  lines.push("");
  lines.push(
    `Sources: ${top
      .map((c, i) => `[${i + 1}] ${c.documentName}`)
      .join("; ")}`
  );

  if (confidence < 0.35) {
    lines.push("");
    lines.push(
      "Note: Retrieval confidence is low — the answer may be incomplete. Consider uploading more specific documents."
    );
  }

  return {
    answer: lines.join("\n"),
    confidence: Number(confidence.toFixed(2)),
    coverage: Number(coverage.toFixed(2)),
  };
}

function pickSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  return sentences
    .slice(0, max)
    .map((s) => s.trim())
    .join(" ")
    .slice(0, 420);
}
