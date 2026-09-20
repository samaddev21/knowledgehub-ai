import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return true;
      return v === "true" || v === "1";
    }),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  DATABASE_URL: z.string().optional(),
  MAX_UPLOAD_BYTES: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 10 * 1024 * 1024)),
  RETRIEVAL_TOP_K: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 5)),
  CHUNK_SIZE: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 800)),
  CHUNK_OVERLAP: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 120)),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DEMO_MODE: process.env.DEMO_MODE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
    OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
    DATABASE_URL: process.env.DATABASE_URL,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    RETRIEVAL_TOP_K: process.env.RETRIEVAL_TOP_K,
    CHUNK_SIZE: process.env.CHUNK_SIZE,
    CHUNK_OVERLAP: process.env.CHUNK_OVERLAP,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  cached = parsed.data;
  return cached;
}

/** True when we intentionally run without external AI / Postgres. */
export function isDemoMode(): boolean {
  const env = getEnv();
  if (env.DEMO_MODE) return true;
  // Auto-demo when no OpenAI key is configured
  return !env.OPENAI_API_KEY;
}

export function hasOpenAI(): boolean {
  const key = getEnv().OPENAI_API_KEY;
  return Boolean(key && key.length > 10 && !isDemoMode());
}

export function resetEnvCache() {
  cached = null;
}
