import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChatAttachment,
  ChatConversationSummary,
  ChatMessage,
  ChatResponseStyle,
  ChatSafetyFlag,
  ChatSourceBadge,
  ChatMode,
  StoredConversation,
} from "@/lib/chat/types";

type StorageShape = {
  conversations: Record<string, StoredConversation>;
};

type RawStoredConversation = Partial<StoredConversation> & {
  conversationId?: string;
};

const storagePath = path.join(process.cwd(), "storage", "chat-sessions.json");
const defaultConversationTitle = "New chat";

export async function listConversationSummariesForUser(userId: string) {
  const storage = await readStorage();
  const conversations = getUserConversations(storage, userId);

  if (conversations.length > 0) {
    return sortConversationSummaries(conversations);
  }

  const conversation = createEmptyConversation(userId);
  storage.conversations[getConversationKey(userId, conversation.id)] = conversation;
  await writeStorage(storage);

  return [toConversationSummary(conversation)];
}

export async function createConversation(params: {
  userId: string;
  title?: string;
}) {
  const storage = await readStorage();
  const title = params.title?.trim();
  const conversation = createEmptyConversation(params.userId, title);
  storage.conversations[getConversationKey(params.userId, conversation.id)] =
    conversation;
  await writeStorage(storage);

  return toConversationSummary(conversation);
}

export async function renameConversation(params: {
  userId: string;
  conversationId: string;
  title: string;
}) {
  const storage = await readStorage();
  const conversation = getConversationOrThrow(storage, params.userId, params.conversationId);

  conversation.title = params.title.trim();
  conversation.isAutoTitle = false;
  conversation.updatedAt = new Date().toISOString();

  await writeStorage(storage);

  return toConversationSummary(conversation);
}

export async function deleteConversation(params: {
  userId: string;
  conversationId: string;
}) {
  const storage = await readStorage();
  const key = getConversationKey(params.userId, params.conversationId);

  if (!storage.conversations[key]) {
    return listConversationSummariesForUser(params.userId);
  }

  delete storage.conversations[key];

  const remaining = getUserConversations(storage, params.userId);
  if (remaining.length === 0) {
    const conversation = createEmptyConversation(params.userId);
    storage.conversations[getConversationKey(params.userId, conversation.id)] =
      conversation;
  }

  await writeStorage(storage);
  return sortConversationSummaries(getUserConversations(storage, params.userId));
}

export async function clearConversationMessages(params: {
  userId: string;
  conversationId: string;
}) {
  const storage = await readStorage();
  const conversation = getConversationOrThrow(storage, params.userId, params.conversationId);

  conversation.messages = [];
  conversation.messageCount = 0;
  conversation.preview = "No messages yet";
  conversation.updatedAt = new Date().toISOString();

  if (conversation.isAutoTitle) {
    conversation.title = defaultConversationTitle;
  }

  await writeStorage(storage);
  return toConversationSummary(conversation);
}

export async function getConversationMessages(params: {
  userId: string;
  conversationId: string;
}) {
  const storage = await readStorage();
  const conversation = storage.conversations[getConversationKey(params.userId, params.conversationId)];
  return conversation?.messages ?? [];
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
  const storage = await readStorage();
  const conversation = getConversationOrCreate(storage, params.userId, params.conversationId);
  const existingUserMessages = conversation.messages.filter(
    (message) => message.role === "user"
  ).length;

  const userMessage = buildMessage({
    attachments: params.userAttachments,
    content: params.userMessage,
    role: "user",
  });

  const assistantMessage = buildMessage({
    content: params.assistantMessage,
    followUps: params.assistantFollowUps,
    mode: params.mode,
    responseStyle: params.responseStyle,
    role: "assistant",
    safetyFlags: params.safetyFlags,
    sources: params.assistantSources,
  });

  conversation.messages = [...conversation.messages, userMessage, assistantMessage].slice(-40);
  conversation.messageCount = conversation.messages.length;
  conversation.preview = truncatePreview(assistantMessage.content);
  conversation.updatedAt = assistantMessage.createdAt;

  if (conversation.isAutoTitle && existingUserMessages === 0) {
    conversation.title = buildConversationTitle(params.userMessage);
  }

  storage.conversations[getConversationKey(params.userId, conversation.id)] =
    conversation;
  await writeStorage(storage);

  return {
    userMessage,
    assistantMessage,
    conversationSummary: toConversationSummary(conversation),
  };
}

async function readStorage(): Promise<StorageShape> {
  await mkdir(path.dirname(storagePath), { recursive: true });

  try {
    const fileContents = await readFile(storagePath, "utf8");
    const parsed = JSON.parse(fileContents) as Partial<StorageShape>;
    const { storage, changed } = normalizeStorage(parsed);

    if (changed) {
      await writeStorage(storage);
    }

    return storage;
  } catch {
    const emptyStorage = { conversations: {} } satisfies StorageShape;
    await writeStorage(emptyStorage);
    return emptyStorage;
  }
}

async function writeStorage(storage: StorageShape) {
  await writeFile(storagePath, JSON.stringify(storage, null, 2), "utf8");
}

function buildMessage(params: {
  role: ChatMessage["role"];
  content: string;
  attachments?: ChatAttachment[];
  followUps?: string[];
  sources?: ChatSourceBadge[];
  mode?: ChatMode;
  responseStyle?: ChatResponseStyle;
  safetyFlags?: ChatSafetyFlag[];
}) {
  return {
    id: randomUUID(),
    role: params.role,
    content: params.content,
    createdAt: new Date().toISOString(),
    attachments: params.attachments,
    followUps: params.followUps,
    sources: params.sources,
    mode: params.mode,
    responseStyle: params.responseStyle,
    safetyFlags: params.safetyFlags,
  } satisfies ChatMessage;
}

function getConversationOrCreate(
  storage: StorageShape,
  userId: string,
  conversationId: string
) {
  const key = getConversationKey(userId, conversationId);
  const existingConversation = storage.conversations[key];

  if (existingConversation) {
    return existingConversation;
  }

  const conversation = createEmptyConversation(userId, undefined, conversationId);
  storage.conversations[key] = conversation;
  return conversation;
}

function getConversationOrThrow(
  storage: StorageShape,
  userId: string,
  conversationId: string
) {
  const conversation = storage.conversations[getConversationKey(userId, conversationId)];

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  return conversation;
}

function getUserConversations(storage: StorageShape, userId: string) {
  return Object.values(storage.conversations).filter(
    (conversation) => conversation.userId === userId
  );
}

function sortConversationSummaries(conversations: StoredConversation[]) {
  return conversations
    .map(toConversationSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function toConversationSummary(conversation: StoredConversation): ChatConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messageCount,
    isAutoTitle: conversation.isAutoTitle,
  };
}

function createEmptyConversation(
  userId: string,
  title?: string,
  forcedId?: string
): StoredConversation {
  const now = new Date().toISOString();
  const trimmedTitle = title?.trim();

  return {
    id: forcedId ?? randomUUID(),
    userId,
    title: trimmedTitle || defaultConversationTitle,
    preview: "No messages yet",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    isAutoTitle: !trimmedTitle,
    messages: [],
  };
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

function getConversationKey(userId: string, conversationId: string) {
  return `${userId}::${conversationId}`;
}

function normalizeStorage(parsed: Partial<StorageShape>) {
  const nextStorage: StorageShape = {
    conversations: {},
  };
  let changed = false;

  for (const [rawKey, rawValue] of Object.entries(parsed.conversations ?? {})) {
    if (!rawValue || typeof rawValue !== "object") {
      changed = true;
      continue;
    }

    const normalizedConversation = normalizeConversation(rawKey, rawValue);

    if (!normalizedConversation) {
      changed = true;
      continue;
    }

    const normalizedKey = getConversationKey(
      normalizedConversation.userId,
      normalizedConversation.id
    );
    const existingConversation = nextStorage.conversations[normalizedKey];

    nextStorage.conversations[normalizedKey] = choosePreferredConversation(
      existingConversation,
      normalizedConversation
    );

    if (normalizedKey !== rawKey) {
      changed = true;
    }
  }

  return {
    storage: nextStorage,
    changed,
  };
}

function normalizeConversation(rawKey: string, rawValue: RawStoredConversation) {
  const derivedKeyParts = rawKey.split("::");
  const fallbackUserId = derivedKeyParts.length > 1 ? derivedKeyParts[0] : undefined;
  const fallbackId = derivedKeyParts.length > 1 ? derivedKeyParts[1] : rawKey;
  const userId = rawValue.userId ?? fallbackUserId;
  const id = rawValue.id ?? rawValue.conversationId ?? fallbackId;

  if (!userId || !id) {
    return null;
  }

  const messages = Array.isArray(rawValue.messages) ? rawValue.messages : [];
  const createdAt = rawValue.createdAt ?? messages[0]?.createdAt ?? new Date().toISOString();
  const updatedAt =
    rawValue.updatedAt ??
    messages.at(-1)?.createdAt ??
    createdAt;
  const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "";
  const fallbackTitle = buildConversationTitle(firstUserMessage);
  const title = rawValue.title?.trim() || fallbackTitle || defaultConversationTitle;
  const preview =
    rawValue.preview ??
    (messages.length > 0
      ? truncatePreview(messages.at(-1)?.content ?? "")
      : "No messages yet");
  const messageCount = rawValue.messageCount ?? messages.length;

  return {
    id,
    userId,
    title,
    preview,
    createdAt,
    updatedAt,
    messageCount,
    isAutoTitle: rawValue.isAutoTitle ?? !rawValue.title,
    messages,
  } satisfies StoredConversation;
}

function choosePreferredConversation(
  existing: StoredConversation | undefined,
  candidate: StoredConversation
) {
  if (!existing) {
    return candidate;
  }

  if (candidate.messageCount > existing.messageCount) {
    return candidate;
  }

  if (candidate.updatedAt > existing.updatedAt) {
    return candidate;
  }

  return existing;
}
