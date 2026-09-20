import { getSession } from "@/lib/auth/session";
import { AppSidebar } from "@/components/layout/sidebar";
import { CommandHint } from "@/components/layout/command-hint";
import { Badge } from "@/components/ui/badge";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <AppSidebar
        orgName={session.organization.name}
        userName={session.user.name}
        role={session.membership.role}
        demoMode={session.demoMode}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-6">
          <CommandHint />
          <div className="flex items-center gap-2">
            {session.demoMode && (
              <Badge variant="warning">Demo Mode — local retrieval, no external AI</Badge>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
