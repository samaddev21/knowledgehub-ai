import { getEnv, isDemoMode } from "@/lib/env";
import type { SessionContext } from "@/types";
import { getStore } from "@/lib/db/store";

/**
 * Resolves the current session.
 * Demo mode uses a seeded Acme Corp owner session.
 * Production would replace this with NextAuth / Clerk / SSO.
 */
export async function getSession(): Promise<SessionContext> {
  const store = getStore();
  const demo = store.getDemoSession();
  return {
    ...demo,
    demoMode: isDemoMode(),
  };
}

export function getMaxUploadBytes(): number {
  return getEnv().MAX_UPLOAD_BYTES;
}
