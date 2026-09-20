"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Ask", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: BookOpen },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/search", label: "Search", icon: Search },
];

export function AppSidebar({
  orgName,
  userName,
  role,
  demoMode,
}: {
  orgName: string;
  userName: string;
  role: string;
  demoMode: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">KnowledgeHub AI</div>
          <div className="truncate text-xs text-[var(--muted-foreground)]">{orgName}</div>
        </div>
      </div>

      {demoMode && (
        <div className="px-4 pb-3">
          <Badge variant="warning" className="w-full justify-center py-1">
            Demo Mode
          </Badge>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--sidebar-active)] font-medium text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="text-sm font-medium">{userName}</div>
        <div className="text-xs text-[var(--muted-foreground)] capitalize">{role.toLowerCase()}</div>
      </div>
    </aside>
  );
}
