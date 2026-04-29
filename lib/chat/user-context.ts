import "server-only";

import { mockUsers } from "@/app/data/mock-chat-data";
import { getChatConfig } from "@/lib/chat/config";
import type { ChatUserContext } from "@/lib/chat/types";

export async function resolveChatUserContext(
  requestedUserId?: string
): Promise<ChatUserContext> {
  const { defaultUserId } = await getChatConfig();
  const targetUserId = requestedUserId ?? defaultUserId;

  return (
    mockUsers.find((user) => user.id === targetUserId) ??
    mockUsers.find((user) => user.id === defaultUserId) ??
    mockUsers[0]
  );
}
