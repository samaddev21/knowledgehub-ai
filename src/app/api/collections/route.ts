import { getSession } from "@/lib/auth/session";
import { assertRole, canManageCollections, AuthError } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { handleRouteError, jsonCreated, jsonOk } from "@/lib/api";
import { createCollectionSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const store = getStore();
    const collections = store.listCollections(session.organization.id);
    const docs = store.listDocuments(session.organization.id);
    return jsonOk({
      collections: collections.map((c) => ({
        ...c,
        documentCount: docs.filter((d) => d.collectionId === c.id).length,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!canManageCollections(session)) {
      throw new AuthError("Insufficient permissions", 403);
    }
    const body = createCollectionSchema.parse(await request.json());
    const collection = getStore().createCollection(
      session.organization.id,
      body.name,
      body.description
    );
    return jsonCreated({ collection });
  } catch (err) {
    return handleRouteError(err);
  }
}
