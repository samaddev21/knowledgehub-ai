"use client";

import { useEffect, useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  documentCount: number;
}

export function CollectionsClient() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/collections");
    const json = await res.json();
    setCollections(json.collections ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Collection created");
      setOpen(false);
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Organize company knowledge by domain. Scope chat retrieval to a collection when needed.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create collection</DialogTitle>
              <DialogDescription>Give your team a clear knowledge domain.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button onClick={create} disabled={saving || name.trim().length < 2} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Card key={c.id} className="transition hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-[var(--muted)]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <CardTitle>{c.name}</CardTitle>
              <CardDescription>{c.description || "No description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)]">
                {c.documentCount} document{c.documentCount === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
