"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function CommandHint() {
  const router = useRouter();
  const [openHint, setOpenHint] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => router.push("/search")}
      onMouseEnter={() => setOpenHint(true)}
      onMouseLeave={() => setOpenHint(false)}
      className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--muted-foreground)] transition hover:border-[var(--foreground)]/20"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Search knowledge…</span>
      <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
        ⌘K
      </kbd>
      {openHint && <span className="sr-only">Open search</span>}
    </button>
  );
}
