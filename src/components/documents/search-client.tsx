"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SearchResult {
  rank: number;
  score: number;
  chunkId: string;
  documentName: string;
  collectionName: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

interface Collection {
  id: string;
  name: string;
}

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState("");

  useEffect(() => {
    void fetch("/api/collections")
      .then((r) => r.json())
      .then((j) => setCollections(j.collections ?? []));
  }, []);

  async function runSearch(q?: string) {
    const value = (q ?? query).trim();
    if (!value) return;
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: value,
          collectionId: collectionId || null,
          topK: 8,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setResults(json.results ?? []);
      setDemoMode(Boolean(json.demoMode));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Semantic search</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Embed your query and rank document chunks by cosine similarity.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. rollback production deployment"
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
        />
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
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
        <Button onClick={() => void runSearch()} disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {demoMode && results.length > 0 && (
        <Badge variant="warning">Demo Mode — local hash embeddings</Badge>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Card key={r.chunkId}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">
                    #{r.rank} {r.documentName}
                  </CardTitle>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {r.collectionName} · chunk {r.chunkIndex} · {r.tokenCount} tokens
                  </p>
                </div>
                <Badge variant="secondary">{(r.score * 100).toFixed(1)}% sim</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {r.content}
              </p>
            </CardContent>
          </Card>
        ))}
        {!loading && results.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Run a query to inspect retrieved chunks before they reach the LLM.
          </p>
        )}
      </div>
    </div>
  );
}
