"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CitationSource } from "@/types";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  sources: CitationSource[] | null;
  metadata: {
    confidence?: number;
    coverage?: number;
    mode?: string;
    model?: string;
  } | null;
}

interface Collection {
  id: string;
  name: string;
}

const SUGGESTIONS = [
  "What is our policy for rolling back a failed production deployment?",
  "How many PTO days do full-time employees receive?",
  "What are the SEV1 incident communication requirements?",
  "What discount authority do Account Executives have?",
];

export function ChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [demoMode, setDemoMode] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [selectedSource, setSelectedSource] = useState<CitationSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const json = await res.json();
    setConversations(json.conversations ?? []);
    setDemoMode(Boolean(json.demoMode));
    if (!activeId && json.conversations?.[0]) {
      setActiveId(json.conversations[0].id);
    }
  }, [activeId]);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const json = await res.json();
    setMessages(json.messages ?? []);
    setDemoMode(Boolean(json.demoMode));
  }, []);

  useEffect(() => {
    void loadConversations();
    void fetch("/api/collections")
      .then((r) => r.json())
      .then((j) => setCollections(j.collections ?? []));
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function ensureConversation(): Promise<string> {
    if (activeId) return activeId;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    const id = json.conversation.id as string;
    setActiveId(id);
    await loadConversations();
    return id;
  }

  async function sendMessage(text: string, regenerate = false) {
    const content = text.trim();
    if (!content || streaming) return;

    setStreaming(true);
    setStreamText("");
    setInput("");

    try {
      const conversationId = await ensureConversation();

      if (!regenerate) {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            role: "USER",
            content,
            sources: null,
            metadata: null,
          },
        ]);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: content,
          collectionId: collectionId || null,
        }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Chat failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let donePayload: {
        answer: string;
        sources: CitationSource[];
        confidence: number;
        coverage: number;
        mode: string;
        model: string;
        demoMode: boolean;
      } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          const parsed = JSON.parse(data);
          if (event === "token") {
            assembled += parsed.content;
            setStreamText(assembled);
          } else if (event === "meta") {
            setDemoMode(Boolean(parsed.demoMode));
          } else if (event === "done") {
            donePayload = parsed;
            setDemoMode(Boolean(parsed.demoMode));
          } else if (event === "error") {
            throw new Error(parsed.message);
          }
        }
      }

      setStreamText("");
      await loadMessages(conversationId);
      await loadConversations();

      if (donePayload?.sources?.[0]) {
        // keep panel available
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat failed");
      setStreamText("");
    } finally {
      setStreaming(false);
    }
  }

  function lastUserMessage(): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "USER") return messages[i].content;
    }
    return null;
  }

  async function newConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setActiveId(json.conversation.id);
    setMessages([]);
    setSelectedSource(null);
    await loadConversations();
  }

  function copyAnswer(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  function renderContent(text: string, sources: CitationSource[] | null) {
    if (!sources?.length) return <p className="whitespace-pre-wrap">{text}</p>;

    const parts = text.split(/(\[\d+\])/g);
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (!m) return <span key={i}>{part}</span>;
          const idx = Number(m[1]);
          const source = sources.find((s) => s.index === idx);
          if (!source) return <span key={i}>{part}</span>;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedSource(source)}
              className="mx-0.5 inline-flex items-center rounded bg-[var(--primary)]/10 px-1 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/20"
              title={source.documentName}
            >
              [{idx}]
            </button>
          );
        })}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Conversation list */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] md:flex">
        <div className="flex items-center justify-between p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            Conversations
          </span>
          <Button size="icon" variant="ghost" onClick={newConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-4">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setSelectedSource(null);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition",
                  activeId === c.id
                    ? "bg-[var(--muted)] font-medium"
                    : "hover:bg-[var(--muted)]/60 text-[var(--muted-foreground)]"
                )}
              >
                <div className="truncate">{c.title}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-medium">Ask KnowledgeHub</span>
            {demoMode && <Badge variant="warning">Demo Mode</Badge>}
          </div>
          <select
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.length === 0 && !streaming && (
              <div className="space-y-6 py-10 text-center animate-fade-in">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Grounded answers from your docs
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Retrieval-augmented chat with citations. Answers stay within retrieved context.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void sendMessage(s)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-left text-sm transition hover:border-[var(--primary)]/40 hover:shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "group animate-fade-in",
                  m.role === "USER" ? "ml-8" : "mr-4"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm",
                    m.role === "USER"
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border border-[var(--border)] bg-[var(--card)]"
                  )}
                >
                  {m.role === "ASSISTANT"
                    ? renderContent(m.content, m.sources)
                    : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                </div>

                {m.role === "ASSISTANT" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyAnswer(m.content)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={streaming}
                      onClick={() => {
                        const last = lastUserMessage();
                        if (last) void sendMessage(last, true);
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </Button>
                    {m.metadata?.confidence != null && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Confidence {(m.metadata.confidence * 100).toFixed(0)}%
                        {m.metadata.coverage != null &&
                          ` · Coverage ${(m.metadata.coverage * 100).toFixed(0)}%`}
                        {m.metadata.mode && ` · ${m.metadata.mode}`}
                      </span>
                    )}
                  </div>
                )}

                {m.role === "ASSISTANT" && m.sources && m.sources.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      Sources
                    </p>
                    {m.sources.map((s) => (
                      <button
                        key={s.chunkId}
                        type="button"
                        onClick={() => setSelectedSource(s)}
                        className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-xs transition hover:bg-[var(--muted)]"
                      >
                        <span className="font-semibold text-[var(--primary)]">[{s.index}]</span>
                        <span className="flex-1 truncate font-medium">{s.documentName}</span>
                        <span className="text-[var(--muted-foreground)]">{s.collectionName}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {streaming && streamText && (
              <div className="mr-4 animate-fade-in rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {streamText}
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--primary)]" />
                </p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-[var(--border)] p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about policies, runbooks, playbooks…"
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
            />
            <Button
              className="h-11 shrink-0"
              disabled={streaming || !input.trim()}
              onClick={() => void sendMessage(input)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-[var(--muted-foreground)]">
            Answers are grounded in retrieved chunks.{" "}
            {demoMode
              ? "Demo Mode: local embeddings + extractive synthesis — no external AI called."
              : "OpenAI embeddings and chat are active."}
          </p>
        </div>
      </div>

      {/* Source panel */}
      {selectedSource && (
        <div className="hidden w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--sidebar)] lg:flex animate-slide-in">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-medium">Source [{selectedSource.index}]</span>
            <Button size="sm" variant="ghost" onClick={() => setSelectedSource(null)}>
              Close
            </Button>
          </div>
          <div className="space-y-3 overflow-auto p-4 text-sm">
            <div>
              <p className="font-medium">{selectedSource.documentName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {selectedSource.collectionName} · chunk #{selectedSource.chunkIndex} · score{" "}
                {selectedSource.score.toFixed(3)}
              </p>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-[var(--muted-foreground)]">
              {selectedSource.content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
