import { normalizeText } from "@/lib/ingestion/chunk";

export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".txt") || mimeType === "text/plain") {
    return normalizeText(buffer.toString("utf-8"));
  }

  if (
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    mimeType === "text/markdown" ||
    mimeType === "text/x-markdown"
  ) {
    return normalizeText(stripMarkdownLight(buffer.toString("utf-8")));
  }

  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdf(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType || filename}`);
}

function stripMarkdownLight(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = normalizeText(
      typeof result === "string"
        ? result
        : (result as { text?: string }).text || ""
    );
    if (!text) throw new Error("PDF contained no extractable text");
    return text;
  } catch (err) {
    // Fallback: attempt latin1 decode of buffer for simple text-based PDFs
    const fallback = buffer.toString("latin1");
    const streams = fallback.match(/BT[\s\S]*?ET/g);
    if (streams && streams.length > 0) {
      const joined = streams
        .map((s) =>
          s
            .replace(/BT|ET/g, " ")
            .replace(/\/[A-Za-z0-9]+/g, " ")
            .replace(/[^\x20-\x7E\n]/g, " ")
        )
        .join("\n");
      const cleaned = normalizeText(joined);
      if (cleaned.length > 40) return cleaned;
    }
    throw err instanceof Error ? err : new Error("Failed to parse PDF");
  }
}
