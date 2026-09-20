import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  description: z.string().trim().max(500).optional().nullable(),
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const chatMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1, "Message is required").max(4000),
  collectionId: z.string().optional().nullable(),
});

export const searchSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  collectionId: z.string().optional().nullable(),
  topK: z.number().int().min(1).max(20).optional(),
});

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"] as const;

export function isAllowedUpload(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mimeOk =
    (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType) ||
    mimeType === "application/octet-stream";
  return extOk && mimeOk;
}

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
