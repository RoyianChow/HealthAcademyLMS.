import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatReadLimiter,
  enforceChatRateLimit,
} from "@/lib/chat/arcjet";
import { getConversationMessages } from "@/lib/chat/store";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import { requireUser } from "@/app/data/user/require-user";

export const runtime = "nodejs";

const historyQuerySchema = z.object({
  conversationId: z.string().min(1).default("default"),
});

export async function GET(request: Request) {
  const sessionUser = await requireUser();
  const rateLimit = await enforceChatRateLimit(
    request,
    sessionUser.id,
    chatReadLimiter
  );
  if (rateLimit.denied) {
    return rateLimit.response;
  }

  const url = new URL(request.url);
  const query = historyQuerySchema.parse({
    conversationId: url.searchParams.get("conversationId") ?? undefined,
  });

  const user = await resolveChatUserContext(sessionUser.id);
  const messages = await getConversationMessages({
    userId: user.id,
    conversationId: query.conversationId,
  });

  return NextResponse.json({ messages });
}
