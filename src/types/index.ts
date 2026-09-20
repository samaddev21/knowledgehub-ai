export type Role = "OWNER" | "ADMIN" | "MEMBER";
export type DocumentStatus = "PROCESSING" | "READY" | "FAILED";
export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface Collection {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  organizationId: string;
  collectionId: string;
  uploadedById: string;
  name: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkMetadata {
  documentName?: string;
  collectionName?: string;
  pageEstimate?: number;
  [key: string]: unknown;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  organizationId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  charCount: number;
  embedding: number[];
  metadata: ChunkMetadata;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitationSource {
  index: number;
  chunkId: string;
  documentId: string;
  documentName: string;
  collectionName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface MessageMetadata {
  confidence?: number;
  coverage?: number;
  mode?: "demo" | "openai";
  model?: string;
  retrievedCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: CitationSource[] | null;
  metadata: MessageMetadata | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  organizationId: string;
  type: "document_uploaded" | "document_ready" | "document_failed" | "question_asked" | "collection_created";
  summary: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface SessionContext {
  user: User;
  organization: Organization;
  membership: Membership;
  demoMode: boolean;
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
  documentName: string;
  collectionName: string;
}

export interface DashboardStats {
  documents: number;
  collections: number;
  questionsAsked: number;
  readyDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  recentActivity: ActivityEvent[];
}
