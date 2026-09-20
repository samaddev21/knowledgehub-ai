import { estimateTokens } from "@/lib/utils";

export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  charCount: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

/**
 * Recursive character chunker with overlap.
 * Prefers paragraph → sentence → character boundaries.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize ?? 800;
  const overlap = options.overlap ?? 120;

  const normalized = normalizeText(text);
  if (!normalized.trim()) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pieces: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      pieces.push(para);
      continue;
    }
    const sentences = splitSentences(para);
    let buf = "";
    for (const sentence of sentences) {
      if ((buf + " " + sentence).trim().length <= chunkSize) {
        buf = (buf + " " + sentence).trim();
      } else {
        if (buf) pieces.push(buf);
        if (sentence.length <= chunkSize) {
          buf = sentence;
        } else {
          for (const hard of hardSplit(sentence, chunkSize)) {
            pieces.push(hard);
          }
          buf = "";
        }
      }
    }
    if (buf) pieces.push(buf);
  }

  const withOverlap = applyOverlap(pieces, overlap);
  return withOverlap.map((content, chunkIndex) => ({
    content,
    chunkIndex,
    tokenCount: estimateTokens(content),
    charCount: content.length,
  }));
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [text];
}

function hardSplit(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size).trim());
  }
  return out.filter(Boolean);
}

function applyOverlap(pieces: string[], overlap: number): string[] {
  if (overlap <= 0 || pieces.length <= 1) return pieces;
  const result: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    if (i === 0) {
      result.push(pieces[i]);
      continue;
    }
    const prev = pieces[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - overlap));
    const merged = `${tail} ${pieces[i]}`.trim();
    result.push(merged);
  }
  return result;
}
