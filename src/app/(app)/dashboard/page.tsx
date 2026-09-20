import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import { BookOpen, FolderOpen, MessageSquare, Activity } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const stats = getStore().getDashboard(session.organization.id);

  const cards = [
    { label: "Documents", value: stats.documents, icon: BookOpen, hint: `${stats.readyDocuments} ready` },
    { label: "Collections", value: stats.collections, icon: FolderOpen, hint: "Knowledge domains" },
    { label: "Questions asked", value: stats.questionsAsked, icon: MessageSquare, hint: "Across conversations" },
    {
      label: "Pipeline",
      value: stats.processingDocuments + stats.failedDocuments,
      icon: Activity,
      hint: `${stats.processingDocuments} processing · ${stats.failedDocuments} failed`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Internal knowledge for {session.organization.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/documents">Upload docs</Link>
          </Button>
          <Button asChild>
            <Link href="/chat">Ask a question</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{c.label}</CardDescription>
                  <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
                <CardTitle className="text-3xl tabular-nums">{c.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted-foreground)]">{c.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Uploads, indexing, and questions in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {stats.recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm">{a.summary}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {a.type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                    {formatRelative(a.createdAt)}
                  </span>
                </li>
              ))}
              {stats.recentActivity.length === 0 && (
                <li className="text-sm text-[var(--muted-foreground)]">No activity yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>RAG pipeline for this workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>Documents are extracted, chunked, embedded, and stored as vectors.</p>
            <p>Questions retrieve the top-K similar chunks, then an answer is grounded in that context with citations.</p>
            {session.demoMode && (
              <Badge variant="warning" className="mt-2">
                Demo Mode uses local embeddings — no OpenAI calls
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
