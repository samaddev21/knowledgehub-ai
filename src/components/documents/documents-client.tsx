"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBytes, formatRelative } from "@/lib/utils";
import { toast } from "sonner";

interface DocRow {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  status: "PROCESSING" | "READY" | "FAILED";
  chunkCount: number;
  fileSize: number;
  createdAt: string;
  errorMessage: string | null;
}

interface Collection {
  id: string;
  name: string;
}

function statusBadge(status: DocRow["status"]) {
  if (status === "READY") return <Badge variant="success">Ready</Badge>;
  if (status === "PROCESSING") return <Badge variant="warning">Processing</Badge>;
  return <Badge variant="danger">Failed</Badge>;
}

export function DocumentsClient() {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [collectionId, setCollectionId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const [docsRes, colsRes] = await Promise.all([
      fetch("/api/documents"),
      fetch("/api/collections"),
    ]);
    const docsJson = await docsRes.json();
    const colsJson = await colsRes.json();
    setDocuments(docsJson.documents ?? []);
    setCollections(colsJson.collections ?? []);
    if (!collectionId && colsJson.collections?.[0]) {
      setCollectionId(colsJson.collections[0].id);
    }
    setLoading(false);
  }, [collectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload() {
    if (!file || !collectionId) {
      toast.error("Select a collection and file");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("collectionId", collectionId);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      toast.success(
        json.document.status === "READY"
          ? `Indexed ${json.document.chunkCount} chunks`
          : "Upload processed with errors"
      );
      setOpen(false);
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document and its chunks?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Delete failed");
      return;
    }
    toast.success("Document deleted");
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Upload PDF, TXT, or Markdown. Files are extracted, chunked, and embedded.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
              <DialogDescription>
                Max 10 MB. Supported: .pdf, .txt, .md
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Collection</span>
                <select
                  className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">File</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
              </label>
              <Button onClick={onUpload} disabled={uploading} className="w-full">
                {uploading ? "Processing…" : "Upload & index"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Chunks</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--muted-foreground)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--muted-foreground)]">
                    No documents yet.
                  </td>
                </tr>
              )}
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                      <div>
                        <div className="font-medium">{d.name}</div>
                        {d.errorMessage && (
                          <div className="text-xs text-red-600">{d.errorMessage}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">{d.collectionName}</td>
                  <td className="px-5 py-3">{statusBadge(d.status)}</td>
                  <td className="px-5 py-3 tabular-nums">{d.chunkCount}</td>
                  <td className="px-5 py-3">{formatBytes(d.fileSize)}</td>
                  <td className="px-5 py-3 text-[var(--muted-foreground)]">
                    {formatRelative(d.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
