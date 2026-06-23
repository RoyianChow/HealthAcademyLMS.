import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearConversationMessages,
  createConversation,
  deleteConversation,
  listConversationSummariesForUser,
  renameConversation,
} from "@/lib/chat/store";
import type { ChatConversationSummary } from "@/lib/chat/types";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import { requireUser } from "@/app/data/user/require-user";

export const runtime = "nodejs";

const mutationSchema = z.object({
  action: z.enum(["create", "rename", "delete", "clear"]),
  conversationId: z.string().min(1).optional(),
  title: z.string().trim().max(60).optional(),
  activeConversationId: z.string().min(1).optional(),
});

export async function GET() {
  const sessionUser = await requireUser();
  const user = await resolveChatUserContext(sessionUser.id);
  const summaries = await listConversationSummariesForUser(user.id);

  return NextResponse.json({
    summaries,
    activeConversationId: summaries[0]?.id ?? "",
  });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireUser();
    const body = mutationSchema.parse(await request.json());
    const user = await resolveChatUserContext(sessionUser.id);

    let conversation: ChatConversationSummary | undefined;
    let summaries: ChatConversationSummary[];
    let activeConversationId = body.activeConversationId ?? "";

    switch (body.action) {
      case "create":
        conversation = await createConversation({
          userId: user.id,
          title: body.title,
        });

        summaries = [
          conversation,
          ...(await listConversationSummariesForUser(user.id)).filter(
            (summary) => summary.id !== conversation!.id
          ),
        ];

        activeConversationId = conversation.id;
        break;

      case "rename":
        if (!body.conversationId) {
          throw new Error("Conversation ID is required to rename a thread.");
        }

        if (!body.title?.trim()) {
          throw new Error("Please enter a title for the thread.");
        }

        conversation = await renameConversation({
          userId: user.id,
          conversationId: body.conversationId,
          title: body.title,
        });

        summaries = (await listConversationSummariesForUser(user.id)).map(
          (summary) => (summary.id === conversation!.id ? conversation! : summary)
        );

        activeConversationId = body.conversationId;
        break;

      case "clear":
        if (!body.conversationId) {
          throw new Error("Conversation ID is required to clear a thread.");
        }

        conversation = await clearConversationMessages({
          userId: user.id,
          conversationId: body.conversationId,
        });

        summaries = (await listConversationSummariesForUser(user.id)).map(
          (summary) => (summary.id === conversation!.id ? conversation! : summary)
        );

        activeConversationId = body.conversationId;
        break;

      case "delete":
        if (!body.conversationId) {
          throw new Error("Conversation ID is required to delete a thread.");
        }

        summaries = await deleteConversation({
          userId: user.id,
          conversationId: body.conversationId,
        });

        activeConversationId = resolveActiveConversationId({
          activeConversationId,
          deletedConversationId: body.conversationId,
          summaries,
        });

        break;
    }

    return NextResponse.json({
      summaries,
      activeConversationId,
      conversation,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unable to update chat threads.";

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

function resolveActiveConversationId(params: {
  activeConversationId: string;
  deletedConversationId: string;
  summaries: ChatConversationSummary[];
}) {
  if (
    params.activeConversationId &&
    params.activeConversationId !== params.deletedConversationId &&
    params.summaries.some((summary) => summary.id === params.activeConversationId)
  ) {
    return params.activeConversationId;
  }

  return params.summaries[0]?.id ?? "";
}