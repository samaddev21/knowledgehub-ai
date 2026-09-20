import { getSession } from "@/lib/auth/session";
import { handleRouteError, jsonOk } from "@/lib/api";
import { isDemoMode, hasOpenAI, getEnv } from "@/lib/env";

export async function GET() {
  try {
    const session = await getSession();
    const env = getEnv();
    return jsonOk({
      user: session.user,
      organization: session.organization,
      role: session.membership.role,
      demoMode: isDemoMode(),
      openaiConfigured: hasOpenAI(),
      embeddingModel: hasOpenAI() ? env.OPENAI_EMBEDDING_MODEL : "local-hash-embedding-v1",
      chatModel: hasOpenAI() ? env.OPENAI_CHAT_MODEL : "demo-extractive-rag",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
