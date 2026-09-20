import { createHash, randomUUID } from "crypto";
import { localEmbed } from "@/lib/ai/embeddings";
import { chunkText } from "@/lib/ingestion/chunk";
import type {
  ActivityEvent,
  Collection,
  Conversation,
  DashboardStats,
  Document,
  DocumentChunk,
  Membership,
  Message,
  Organization,
  Role,
  User,
} from "@/types";
import { SEED_DOCUMENTS } from "@/data/seed/documents";

const GLOBAL_KEY = "__knowledgehub_store__";

interface StoreData {
  organizations: Map<string, Organization>;
  users: Map<string, User>;
  memberships: Map<string, Membership>;
  collections: Map<string, Collection>;
  documents: Map<string, Document>;
  chunks: Map<string, DocumentChunk>;
  conversations: Map<string, Conversation>;
  messages: Map<string, Message>;
  activity: ActivityEvent[];
  seeded: boolean;
  demoUserId: string;
  demoOrgId: string;
}

function now() {
  return new Date().toISOString();
}

function id() {
  return randomUUID();
}

export class KnowledgeStore {
  private data: StoreData;
  private seeding = false;

  constructor() {
    this.data = this.empty();
  }

  private empty(): StoreData {
    return {
      organizations: new Map(),
      users: new Map(),
      memberships: new Map(),
      collections: new Map(),
      documents: new Map(),
      chunks: new Map(),
      conversations: new Map(),
      messages: new Map(),
      activity: [],
      seeded: false,
      demoUserId: "",
      demoOrgId: "",
    };
  }

  ensureSeeded() {
    if (this.data.seeded || this.seeding) return;
    this.seeding = true;
    try {
      this.seed();
      this.data.seeded = true;
    } finally {
      this.seeding = false;
    }
  }

  resetAndSeed() {
    this.data = this.empty();
    this.ensureSeeded();
  }

  private seed() {
    const ts = now();
    const orgId = id();
    const userId = id();
    const adminId = id();
    const memberId = id();

    const org: Organization = {
      id: orgId,
      name: "Acme Corporation",
      slug: "acme",
      createdAt: ts,
      updatedAt: ts,
    };

    const owner: User = {
      id: userId,
      email: "alex.morgan@acme.example",
      name: "Alex Morgan",
      createdAt: ts,
      updatedAt: ts,
    };
    const admin: User = {
      id: adminId,
      email: "jordan.lee@acme.example",
      name: "Jordan Lee",
      createdAt: ts,
      updatedAt: ts,
    };
    const member: User = {
      id: memberId,
      email: "sam.patel@acme.example",
      name: "Sam Patel",
      createdAt: ts,
      updatedAt: ts,
    };

    this.data.organizations.set(orgId, org);
    this.data.users.set(userId, owner);
    this.data.users.set(adminId, admin);
    this.data.users.set(memberId, member);

    this.addMembership(orgId, userId, "OWNER");
    this.addMembership(orgId, adminId, "ADMIN");
    this.addMembership(orgId, memberId, "MEMBER");

    const collectionDefs = [
      { name: "Engineering", description: "Architecture, deployment, and on-call runbooks" },
      { name: "HR", description: "People policies, benefits, and workplace guidelines" },
      { name: "Operations", description: "Facilities, vendors, and business continuity" },
      { name: "Product", description: "Roadmaps, PRDs, and release notes" },
      { name: "Sales", description: "Playbooks, pricing, and competitive notes" },
    ];

    const collectionIds: Record<string, string> = {};
    for (const c of collectionDefs) {
      const col = this.createCollectionInternal(orgId, c.name, c.description);
      collectionIds[c.name] = col.id;
    }

    for (const seed of SEED_DOCUMENTS) {
      const collectionId = collectionIds[seed.collection];
      if (!collectionId) continue;
      this.ingestSeedDocument({
        organizationId: orgId,
        collectionId,
        uploadedById: userId,
        name: seed.name,
        mimeType: seed.mimeType,
        content: seed.content,
      });
    }

    // Seed a sample conversation
    const conv = this.createConversationInternal(orgId, userId, "Deployment rollback policy");
    this.addMessage({
      conversationId: conv.id,
      role: "USER",
      content: "What is our policy for rolling back a failed production deployment?",
    });
    this.addMessage({
      conversationId: conv.id,
      role: "ASSISTANT",
      content:
        "According to the Engineering Deployment Guide, if a production deployment fails health checks within the first 15 minutes, on-call should initiate an immediate rollback to the previous stable release and open an incident channel. [1]",
      sources: [],
      metadata: { mode: "demo", confidence: 0.82, coverage: 0.7 },
    });

    this.pushActivity(orgId, "question_asked", "Alex asked about production rollback policy");

    this.data.demoOrgId = orgId;
    this.data.demoUserId = userId;
  }

  private addMembership(organizationId: string, userId: string, role: Role) {
    const m: Membership = {
      id: id(),
      organizationId,
      userId,
      role,
      createdAt: now(),
    };
    this.data.memberships.set(m.id, m);
    return m;
  }

  getDemoSession() {
    this.ensureSeeded();
    const user = this.data.users.get(this.data.demoUserId)!;
    const organization = this.data.organizations.get(this.data.demoOrgId)!;
    const membership = [...this.data.memberships.values()].find(
      (m) => m.userId === user.id && m.organizationId === organization.id
    )!;
    return { user, organization, membership };
  }

  getMembership(organizationId: string, userId: string) {
    return [...this.data.memberships.values()].find(
      (m) => m.organizationId === organizationId && m.userId === userId
    );
  }

  // —— Collections ——
  listCollections(organizationId: string) {
    this.ensureSeeded();
    return [...this.data.collections.values()]
      .filter((c) => c.organizationId === organizationId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getCollection(id: string) {
    this.ensureSeeded();
    return this.data.collections.get(id) ?? null;
  }

  createCollection(organizationId: string, name: string, description?: string | null) {
    this.ensureSeeded();
    return this.createCollectionInternal(organizationId, name, description);
  }

  private createCollectionInternal(
    organizationId: string,
    name: string,
    description?: string | null
  ) {
    const existing = [...this.data.collections.values()].find(
      (c) => c.organizationId === organizationId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) throw new Error("A collection with this name already exists");
    const ts = now();
    const col: Collection = {
      id: id(),
      organizationId,
      name,
      description: description ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.data.collections.set(col.id, col);
    this.pushActivity(organizationId, "collection_created", `Collection "${name}" created`);
    return col;
  }

  // —— Documents ——
  listDocuments(organizationId: string, collectionId?: string) {
    this.ensureSeeded();
    return [...this.data.documents.values()]
      .filter((d) => d.organizationId === organizationId)
      .filter((d) => !collectionId || d.collectionId === collectionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getDocument(id: string) {
    this.ensureSeeded();
    return this.data.documents.get(id) ?? null;
  }

  createDocumentRecord(input: {
    organizationId: string;
    collectionId: string;
    uploadedById: string;
    name: string;
    mimeType: string;
    fileSize: number;
  }): Document {
    this.ensureSeeded();
    return this.createDocumentRecordInternal(input);
  }

  private createDocumentRecordInternal(input: {
    organizationId: string;
    collectionId: string;
    uploadedById: string;
    name: string;
    mimeType: string;
    fileSize: number;
  }): Document {
    const ts = now();
    const doc: Document = {
      id: id(),
      organizationId: input.organizationId,
      collectionId: input.collectionId,
      uploadedById: input.uploadedById,
      name: input.name,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      status: "PROCESSING",
      errorMessage: null,
      chunkCount: 0,
      contentHash: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.data.documents.set(doc.id, doc);
    this.pushActivity(
      input.organizationId,
      "document_uploaded",
      `Uploaded "${input.name}"`
    );
    return doc;
  }

  updateDocument(id: string, patch: Partial<Document>) {
    const doc = this.data.documents.get(id);
    if (!doc) return null;
    const updated = { ...doc, ...patch, updatedAt: now() };
    this.data.documents.set(id, updated);
    return updated;
  }

  deleteDocument(id: string) {
    const doc = this.data.documents.get(id);
    if (!doc) return false;
    for (const [cid, chunk] of this.data.chunks) {
      if (chunk.documentId === id) this.data.chunks.delete(cid);
    }
    this.data.documents.delete(id);
    return true;
  }

  replaceChunks(documentId: string, chunks: Omit<DocumentChunk, "id" | "createdAt">[]) {
    for (const [cid, chunk] of this.data.chunks) {
      if (chunk.documentId === documentId) this.data.chunks.delete(cid);
    }
    const ts = now();
    for (const c of chunks) {
      const chunk: DocumentChunk = { ...c, id: id(), createdAt: ts };
      this.data.chunks.set(chunk.id, chunk);
    }
  }

  getChunk(id: string) {
    this.ensureSeeded();
    return this.data.chunks.get(id) ?? null;
  }

  listChunksForDocument(documentId: string) {
    return [...this.data.chunks.values()]
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  listChunksForSearch(params: { organizationId: string; collectionId?: string | null }) {
    this.ensureSeeded();
    const docs = this.listDocuments(params.organizationId).filter(
      (d) =>
        d.status === "READY" &&
        (!params.collectionId || d.collectionId === params.collectionId)
    );
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const colMap = new Map(
      this.listCollections(params.organizationId).map((c) => [c.id, c])
    );

    const results: {
      chunk: DocumentChunk;
      documentName: string;
      collectionName: string;
    }[] = [];

    for (const chunk of this.data.chunks.values()) {
      const doc = docMap.get(chunk.documentId);
      if (!doc) continue;
      const col = colMap.get(doc.collectionId);
      results.push({
        chunk,
        documentName: doc.name,
        collectionName: col?.name ?? "Unknown",
      });
    }
    return results;
  }

  ingestSeedDocument(input: {
    organizationId: string;
    collectionId: string;
    uploadedById: string;
    name: string;
    mimeType: string;
    content: string;
  }) {
    const doc = this.createDocumentRecordInternal({
      organizationId: input.organizationId,
      collectionId: input.collectionId,
      uploadedById: input.uploadedById,
      name: input.name,
      mimeType: input.mimeType,
      fileSize: Buffer.byteLength(input.content, "utf-8"),
    });

    const collection = this.getCollection(input.collectionId);
    const pieces = chunkText(input.content, { chunkSize: 700, overlap: 100 });
    const hash = createHash("sha256").update(input.content).digest("hex");

    const chunks = pieces.map((p) => ({
      documentId: doc.id,
      organizationId: input.organizationId,
      chunkIndex: p.chunkIndex,
      content: p.content,
      tokenCount: p.tokenCount,
      charCount: p.charCount,
      embedding: localEmbed(p.content),
      metadata: {
        documentName: input.name,
        collectionName: collection?.name,
      },
    }));

    this.replaceChunks(doc.id, chunks);
    this.updateDocument(doc.id, {
      status: "READY",
      chunkCount: chunks.length,
      contentHash: hash,
    });
    this.pushActivity(
      input.organizationId,
      "document_ready",
      `"${input.name}" indexed (${chunks.length} chunks)`
    );
    return doc;
  }

  // —— Conversations ——
  listConversations(organizationId: string, userId: string) {
    this.ensureSeeded();
    return [...this.data.conversations.values()]
      .filter((c) => c.organizationId === organizationId && c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getConversation(id: string) {
    this.ensureSeeded();
    return this.data.conversations.get(id) ?? null;
  }

  createConversation(organizationId: string, userId: string, title = "New conversation") {
    this.ensureSeeded();
    return this.createConversationInternal(organizationId, userId, title);
  }

  private createConversationInternal(
    organizationId: string,
    userId: string,
    title = "New conversation"
  ) {
    const ts = now();
    const conv: Conversation = {
      id: id(),
      organizationId,
      userId,
      title,
      createdAt: ts,
      updatedAt: ts,
    };
    this.data.conversations.set(conv.id, conv);
    return conv;
  }

  updateConversation(id: string, patch: Partial<Conversation>) {
    const conv = this.data.conversations.get(id);
    if (!conv) return null;
    const updated = { ...conv, ...patch, updatedAt: now() };
    this.data.conversations.set(id, updated);
    return updated;
  }

  deleteConversation(id: string) {
    for (const [mid, msg] of this.data.messages) {
      if (msg.conversationId === id) this.data.messages.delete(mid);
    }
    return this.data.conversations.delete(id);
  }

  listMessages(conversationId: string) {
    return [...this.data.messages.values()]
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addMessage(input: {
    conversationId: string;
    role: Message["role"];
    content: string;
    sources?: Message["sources"];
    metadata?: Message["metadata"];
  }) {
    const msg: Message = {
      id: id(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      sources: input.sources ?? null,
      metadata: input.metadata ?? null,
      createdAt: now(),
    };
    this.data.messages.set(msg.id, msg);
    const conv = this.data.conversations.get(input.conversationId);
    if (conv) {
      this.data.conversations.set(input.conversationId, {
        ...conv,
        updatedAt: now(),
      });
    }
    return msg;
  }

  countQuestions(organizationId: string) {
    const convIds = new Set(
      [...this.data.conversations.values()]
        .filter((c) => c.organizationId === organizationId)
        .map((c) => c.id)
    );
    return [...this.data.messages.values()].filter(
      (m) => convIds.has(m.conversationId) && m.role === "USER"
    ).length;
  }

  getDashboard(organizationId: string): DashboardStats {
    this.ensureSeeded();
    const docs = this.listDocuments(organizationId);
    return {
      documents: docs.length,
      collections: this.listCollections(organizationId).length,
      questionsAsked: this.countQuestions(organizationId),
      readyDocuments: docs.filter((d) => d.status === "READY").length,
      processingDocuments: docs.filter((d) => d.status === "PROCESSING").length,
      failedDocuments: docs.filter((d) => d.status === "FAILED").length,
      recentActivity: this.data.activity
        .filter((a) => a.organizationId === organizationId)
        .slice(0, 12),
    };
  }

  private pushActivity(
    organizationId: string,
    type: ActivityEvent["type"],
    summary: string,
    meta?: Record<string, unknown>
  ) {
    this.data.activity.unshift({
      id: id(),
      organizationId,
      type,
      summary,
      createdAt: now(),
      meta,
    });
    this.data.activity = this.data.activity.slice(0, 100);
  }

  recordQuestion(organizationId: string, summary: string) {
    this.pushActivity(organizationId, "question_asked", summary);
  }
}

export function getStore(): KnowledgeStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: KnowledgeStore };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new KnowledgeStore();
  }
  g[GLOBAL_KEY].ensureSeeded();
  return g[GLOBAL_KEY];
}
