import "server-only";

import { prisma } from "@/lib/db";
import type {
  ChatAttachment,
  ChatConversationSummary,
  ChatMessage,
  ChatResponseStyle,
  ChatSafetyFlag,
  ChatSourceBadge,
  ChatMode,
} from "@/lib/chat/types";

const defaultConversationTitle = "New chat";
const maxMessagesPerConversation = 40;
const maxConversationsPerUser = 50;
// Only the most recent messages are sent to the LLM verbatim. Older turns are
// condensed into a lightweight running summary to keep input token cost bounded
// on long threads while preserving topical continuity.
const promptHistoryWindow = 16;
const maxSummaryPoints = 12;

export async function listConversationSummariesForUser(
  userId: string,
  options?: { limit?: number }
): Promise<ChatConversationSummary[]> {
  const limit = options?.limit ?? maxConversationsPerUser;
  const conversations = await prisma.chatConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  if (conversations.length > 0) {
    return conversations.map(toConversationSummary);
  }

  const created = await prisma.chatConversation.create({
    data: {
      userId,
      title: defaultConversationTitle,
      isAutoTitle: true,
    },
  });

  return [toConversationSummary(created)];
}

export async function createConversation(params: {
  userId: string;
  title?: string;
}): Promise<ChatConversationSummary> {
  const title = params.title?.trim() || defaultConversationTitle;
  const isAutoTitle = !params.title?.trim();

  const conversation = await prisma.chatConversation.create({
    data: { userId: params.userId, title, isAutoTitle },
  });

  return toConversationSummary(conversation);
}

export async function renameConversation(params: {
  userId: string;
  conversationId: string;
  title: string;
}): Promise<ChatConversationSummary> {
  const conversation = await prisma.chatConversation.update({
    where: { id: params.conversationId, userId: params.userId },
    data: { title: params.title.trim(), isAutoTitle: false },
  });

  return toConversationSummary(conversation);
}

export async function deleteConversation(params: {
  userId: string;
  conversationId: string;
}): Promise<ChatConversationSummary[]> {
  await prisma.chatConversation.deleteMany({
    where: { id: params.conversationId, userId: params.userId },
  });

  const remaining = await prisma.chatConversation.findMany({
    where: { userId: params.userId },
    orderBy: { updatedAt: "desc" },
    take: maxConversationsPerUser,
  });

  if (remaining.length === 0) {
    const fallback = await prisma.chatConversation.create({
      data: { userId: params.userId, title: defaultConversationTitle, isAutoTitle: true },
    });
    return [toConversationSummary(fallback)];
  }

  return remaining.map(toConversationSummary);
}

export async function clearConversationMessages(params: {
  userId: string;
  conversationId: string;
}): Promise<ChatConversationSummary> {
  await prisma.chatMessage.deleteMany({
    where: { conversationId: params.conversationId },
  });

  const conversation = await prisma.chatConversation.update({
    where: { id: params.conversationId, userId: params.userId },
    data: {
      preview: "No messages yet",
      messageCount: 0,
      title: undefined,
    },
  });

  if (conversation.isAutoTitle) {
    await prisma.chatConversation.update({
      where: { id: params.conversationId },
      data: { title: defaultConversationTitle },
    });
  }

  const refreshed = await prisma.chatConversation.findUniqueOrThrow({
    where: { id: params.conversationId },
  });

  return toConversationSummary(refreshed);
}

export async function getConversationMessages(params: {
  userId: string;
  conversationId: string;
}): Promise<ChatMessage[]> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: params.conversationId, userId: params.userId },
  });

  if (!conversation) {
    return [];
  }

  const rows = await prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: "asc" },
    take: maxMessagesPerConversation,
  });

  return rows.map(rowToMessage);
}

export async function getConversationContext(params: {
  userId: string;
  conversationId: string;
}): Promise<{ recentMessages: ChatMessage[]; earlierSummary: string | null }> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: params.conversationId, userId: params.userId },
  });

  if (!conversation) {
    return { recentMessages: [], earlierSummary: null };
  }

  const totalRows = await prisma.chatMessage.count({
    where: { conversationId: params.conversationId },
  });

  if (totalRows <= promptHistoryWindow) {
    const rows = await prisma.chatMessage.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: "asc" },
      take: maxMessagesPerConversation,
    });
    return { recentMessages: rows.map(rowToMessage), earlierSummary: null };
  }

  const earlierCount = Math.min(
    totalRows - promptHistoryWindow,
    maxMessagesPerConversation - promptHistoryWindow
  );
  const [earlierRows, recentRows] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: "asc" },
      take: earlierCount,
    }),
    prisma.chatMessage.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: "desc" },
      take: promptHistoryWindow,
    }),
  ]);

  const earlierMessages = earlierRows.map(rowToMessage);
  const recentMessages = recentRows.reverse().map(rowToMessage);

  return {
    recentMessages,
    earlierSummary: buildEarlierConversationSummary(earlierMessages),
  };
}

export async function appendConversationTurn(params: {
  userId: string;
  conversationId: string;
  userMessage: string;
  userAttachments?: ChatAttachment[];
  assistantMessage: string;
  assistantSources?: ChatSourceBadge[];
  assistantFollowUps?: string[];
  mode: ChatMode;
  responseStyle: ChatResponseStyle;
  safetyFlags?: ChatSafetyFlag[];
}) {
  return prisma.$transaction(async (tx) => {
    let conversation = await tx.chatConversation.findFirst({
      where: { id: params.conversationId, userId: params.userId },
    });

    if (!conversation) {
      conversation = await tx.chatConversation.create({
        data: {
          id: params.conversationId,
          userId: params.userId,
          title: defaultConversationTitle,
          isAutoTitle: true,
        },
      });
    }

    const existingUserCount = await tx.chatMessage.count({
      where: { conversationId: params.conversationId, role: "user" },
    });

    const userRow = await tx.chatMessage.create({
      data: {
        conversationId: params.conversationId,
        role: "user",
        content: params.userMessage,
        attachments: (params.userAttachments as object[] | undefined) ?? undefined,
      },
    });

    const assistantRow = await tx.chatMessage.create({
      data: {
        conversationId: params.conversationId,
        role: "assistant",
        content: params.assistantMessage,
        sources: (params.assistantSources as object[] | undefined) ?? undefined,
        followUps: params.assistantFollowUps ?? undefined,
        safetyFlags: (params.safetyFlags as object[] | undefined) ?? undefined,
        mode: params.mode,
        responseStyle: params.responseStyle,
      },
    });

    const totalMessages = conversation.messageCount + 2;
    const prunedTotal = Math.min(totalMessages, maxMessagesPerConversation);

    if (totalMessages > maxMessagesPerConversation) {
      const overflow = totalMessages - maxMessagesPerConversation;
      const oldest = await tx.chatMessage.findMany({
        where: { conversationId: params.conversationId },
        orderBy: { createdAt: "asc" },
        take: overflow,
        select: { id: true },
      });
      await tx.chatMessage.deleteMany({
        where: { id: { in: oldest.map((m) => m.id) } },
      });
    }

    const newTitle =
      conversation.isAutoTitle && existingUserCount === 0
        ? buildConversationTitle(params.userMessage)
        : undefined;

    const updatedConversation = await tx.chatConversation.update({
      where: { id: params.conversationId },
      data: {
        preview: truncatePreview(params.assistantMessage),
        messageCount: prunedTotal,
        ...(newTitle ? { title: newTitle, isAutoTitle: false } : {}),
      },
    });

    return {
      userMessage: rowToMessage(userRow),
      assistantMessage: rowToMessage(assistantRow),
      conversationSummary: toConversationSummary(updatedConversation),
    };
  });
}

function toConversationSummary(row: {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isAutoTitle: boolean;
}): ChatConversationSummary {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row.messageCount,
    isAutoTitle: row.isAutoTitle,
  };
}

function rowToMessage(row: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  sources?: unknown;
  attachments?: unknown;
  followUps?: unknown;
  safetyFlags?: unknown;
  mode?: string | null;
  responseStyle?: string | null;
}): ChatMessage {
  return {
    id: row.id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    sources: (row.sources as ChatSourceBadge[] | undefined) ?? undefined,
    attachments: (row.attachments as ChatAttachment[] | undefined) ?? undefined,
    followUps: (row.followUps as string[] | undefined) ?? undefined,
    safetyFlags: (row.safetyFlags as ChatMessage["safetyFlags"]) ?? undefined,
    mode: (row.mode as ChatMode | undefined) ?? undefined,
    responseStyle: (row.responseStyle as ChatResponseStyle | undefined) ?? undefined,
  };
}

function buildEarlierConversationSummary(earlier: ChatMessage[]): string | null {
  const userQuestions = earlier
    .filter((message) => message.role === "user")
    .map((message) => condenseForSummary(message.content))
    .filter((point): point is string => point.length > 0);

  if (userQuestions.length === 0) {
    return null;
  }

  return userQuestions
    .slice(-maxSummaryPoints)
    .map((point) => `- ${point}`)
    .join("\n");
}

function condenseForSummary(content: string) {
  const normalized = content
    .replace(/^\[Attached PDFs?:.*?\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const words = normalized.split(" ").slice(0, 16).join(" ");
  return words.length > 120 ? `${words.slice(0, 117)}...` : words;
}

function buildConversationTitle(message: string) {
  const normalized = message
    .replace(/^\[Attached PDFs?:.*?\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return defaultConversationTitle;
  }

  const words = normalized.split(" ").slice(0, 6).join(" ");
  return words.length > 36 ? `${words.slice(0, 33)}...` : words;
}

function truncatePreview(content: string) {
  return content.length > 80 ? `${content.slice(0, 77)}...` : content;
}
