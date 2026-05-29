import { NextResponse } from "next/server";
import { z } from "zod";
import { getConversationMessages } from "@/lib/chat/store";
import { resolveChatUserContext } from "@/lib/chat/user-context";

export const runtime = "nodejs";

const historyQuerySchema = z.object({
  userId: z.string().optional(),
  conversationId: z.string().min(1).default("default"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = historyQuerySchema.parse({
    userId: url.searchParams.get("userId") ?? undefined,
    conversationId: url.searchParams.get("conversationId") ?? undefined,
  });

  const user = await resolveChatUserContext(query.userId);
  const messages = await getConversationMessages({
    userId: user.id,
    conversationId: query.conversationId,
  });

  return NextResponse.json({ messages });
}
