import { getSession } from "@/lib/auth/session";
import { assertRole, canManageDocuments } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { handleRouteError, jsonCreated, jsonOk } from "@/lib/api";
import { isAllowedUpload } from "@/lib/validation/schemas";
import { getMaxUploadBytes } from "@/lib/auth/session";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { AuthError } from "@/lib/auth/rbac";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId") ?? undefined;
    const docs = getStore().listDocuments(session.organization.id, collectionId);
    const collections = getStore().listCollections(session.organization.id);
    const colMap = new Map(collections.map((c) => [c.id, c]));
    return jsonOk({
      documents: docs.map((d) => ({
        ...d,
        collectionName: colMap.get(d.collectionId)?.name ?? "Unknown",
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!canManageDocuments(session)) {
      throw new AuthError("Admin or Owner role required to upload documents", 403);
    }

    const form = await request.formData();
    const file = form.get("file");
    const collectionId = String(form.get("collectionId") || "");

    if (!(file instanceof File)) {
      return handleRouteError(new Error("file is required"));
    }
    if (!collectionId) {
      return handleRouteError(new Error("collectionId is required"));
    }

    const store = getStore();
    const collection = store.getCollection(collectionId);
    if (!collection || collection.organizationId !== session.organization.id) {
      throw new AuthError("Collection not found in your organization", 404);
    }

    if (!isAllowedUpload(file.name, file.type || "application/octet-stream")) {
      return handleRouteError(
        new Error("Only PDF, TXT, and Markdown files are allowed")
      );
    }

    const maxBytes = getMaxUploadBytes();
    if (file.size > maxBytes) {
      return handleRouteError(
        new Error(`File exceeds size limit of ${Math.round(maxBytes / 1024 / 1024)} MB`)
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || guessMime(file.name);

    const doc = store.createDocumentRecord({
      organizationId: session.organization.id,
      collectionId,
      uploadedById: session.user.id,
      name: file.name,
      mimeType,
      fileSize: file.size,
    });

    const result = await runIngestionPipeline({
      documentId: doc.id,
      buffer,
      filename: file.name,
      mimeType,
    });

    return jsonCreated({
      document: {
        ...result,
        collectionName: collection.name,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  return "text/plain";
}
