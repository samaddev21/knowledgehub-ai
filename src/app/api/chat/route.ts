import { getSession } from "@/lib/auth/session";
import { assertOrgAccess, assertRole, AuthError } from "@/lib/auth/rbac";
import { getStore } from "@/lib/db/store";
import { chatMessageSchema } from "@/lib/validation/schemas";
import { retrieveRelevantChunks } from "@/lib/retrieval/search";
import { streamAnswer } from "@/lib/ai/answer";
import { handleRouteError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    assertRole(session, "MEMBER");
    const body = chatMessageSchema.parse(await request.json());
    const store = getStore();

    const conversation = store.getConversation(body.conversationId);
    if (!conversation) throw new AuthError("Conversation not found", 404);
    assertOrgAccess(session, conversation.organizationId);
    if (conversation.userId !== session.user.id) {
      throw new AuthError("Conversation not found", 404);
    }

    if (body.collectionId) {
      const col = store.getCollection(body.collectionId);
      if (!col || col.organizationId !== session.organization.id) {
        throw new AuthError("Collection not found", 404);
      }
    }

    const history = store.listMessages(conversation.id);

    store.addMessage({
      conversationId: conversation.id,
      role: "USER",
      content: body.message,
    });

    if (conversation.title === "New conversation") {
      store.updateConversation(conversation.id, {
        title: body.message.slice(0, 72),
      });
    }

    store.recordQuestion(
      session.organization.id,
      `${session.user.name.split(" ")[0]} asked: "${body.message.slice(0, 80)}"`
    );

    const chunks = await retrieveRelevantChunks({
      organizationId: session.organization.id,
      query: body.message,
      collectionId: body.collectionId,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          send("meta", {
            demoMode: session.demoMode,
            retrievedCount: chunks.length,
          });

          let result = null;
          for await (const event of streamAnswer({
            question: body.message,
            chunks,
            history,
          })) {
            if (event.type === "token") {
              send("token", { content: event.content });
            } else if (event.type === "done") {
              result = event.result;
            }
          }

          if (result) {
            store.addMessage({
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: result.answer,
              sources: result.sources,
              metadata: {
                confidence: result.confidence,
                coverage: result.coverage,
                mode: result.mode,
                model: result.model,
                retrievedCount: chunks.length,
              },
            });
            send("done", {
              answer: result.answer,
              sources: result.sources,
              confidence: result.confidence,
              coverage: result.coverage,
              mode: result.mode,
              model: result.model,
              demoMode: session.demoMode,
            });
          }
        } catch (err) {
          send("error", {
            message: err instanceof Error ? err.message : "Chat failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
