/**
 * Integration tests — POST /api/chat
 *
 * Covers authentication, validation, safety override, preference forwarding,
 * and the happy-path reply flow with mocked external dependencies.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/app/data/user/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/chat/openai", () => ({
  generateNutritionReply: vi.fn(),
  streamNutritionReply: vi.fn(),
}));

vi.mock("@/lib/chat/course-context", () => ({
  findRelevantCourseExcerpts: vi.fn().mockReturnValue([]),
  getAccessibleCoursesForUser: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/chat/pdf", () => ({
  extractPdfContexts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/chat/store", () => ({
  getConversationContext: vi.fn().mockResolvedValue({
    recentMessages: [],
    earlierSummary: null,
  }),
  appendConversationTurn: vi.fn(),
}));

vi.mock("@/lib/chat/user-context", () => ({
  resolveChatUserContext: vi.fn(),
}));

vi.mock("@/lib/chat/prompt", () => ({
  buildChatMessages: vi.fn().mockReturnValue([
    { role: "system", content: "system prompt" },
    { role: "user", content: "Hello" },
  ]),
}));

vi.mock("@/lib/chat/safety", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chat/safety")>();

  return {
    ...actual,
    analyzeSafety: vi.fn(actual.analyzeSafety),
  };
});

import { requireUser } from "@/app/data/user/require-user";
import { generateNutritionReply, streamNutritionReply } from "@/lib/chat/openai";
import { buildChatMessages } from "@/lib/chat/prompt";
import { analyzeSafety } from "@/lib/chat/safety";
import { appendConversationTurn } from "@/lib/chat/store";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import { POST as chatHandler } from "@/app/api/chat/route";

const mockRequireUser = vi.mocked(requireUser);
const mockGenerateReply = vi.mocked(generateNutritionReply);
const mockStreamReply = vi.mocked(streamNutritionReply);
const mockBuildChatMessages = vi.mocked(buildChatMessages);
const mockAnalyzeSafety = vi.mocked(analyzeSafety);
const mockAppendTurn = vi.mocked(appendConversationTurn);
const mockResolveUser = vi.mocked(resolveChatUserContext);
const mockRedirect = vi.mocked(redirect);

const SESSION_USER = {
  id: "user-123",
  name: "Regular User",
  email: "user@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  role: "user",
  banned: false,
  banReason: null,
  banExpires: null,
};

const STORED_TURN = {
  userMessage: {
    id: "msg-user-1",
    role: "user" as const,
    content: "What are macronutrients?",
    createdAt: "2026-01-01T12:00:00.000Z",
  },
  assistantMessage: {
    id: "msg-assistant-1",
    role: "assistant" as const,
    content: "Macronutrients include proteins, fats, and carbohydrates.",
    createdAt: "2026-01-01T12:00:01.000Z",
  },
  conversationSummary: {
    id: "conv-1",
    title: "What are macronutrients?",
    preview: "Macronutrients include proteins, fats, and carbohydrates.",
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:01.000Z",
    messageCount: 2,
    isAutoTitle: false,
  },
};

function makeJsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readNdjsonResponse(response: Response) {
  const text = await response.text();

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRequireUser.mockResolvedValue(SESSION_USER);

    mockResolveUser.mockResolvedValue({
      id: SESSION_USER.id,
      name: SESSION_USER.name,
      email: SESSION_USER.email,
      goals: [],
      dietaryFocus: [],
      enrolledCourseIds: [],
    });

    mockGenerateReply.mockResolvedValue(
      "Macronutrients include proteins, fats, and carbohydrates."
    );

    mockStreamReply.mockImplementation(async function* () {
      yield "Macronutrients include proteins, fats, and carbohydrates.";
    });

    mockAppendTurn.mockResolvedValue(STORED_TURN);

    mockAnalyzeSafety.mockImplementation(() => ({
      flags: [],
      promptBlock: "Safety rules:",
      overrideReply: undefined,
    }));
  });

  it("returns 400 when unauthenticated requireUser redirects", async () => {
    mockRequireUser.mockImplementation(async () => {
      redirect("/login");
    });

    const response = await chatHandler(
      makeJsonRequest({
        message: "Hello",
        conversationId: "conv-1",
      })
    );

    expect(response.status).toBe(400);

    const json = await response.json();

    expect(json.error).toBe("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  it("returns stored turn on valid JSON body and streams the assistant reply", async () => {
    const response = await chatHandler(
      makeJsonRequest({
        message: "What are macronutrients?",
        conversationId: "conv-1",
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");

    const events = await readNdjsonResponse(response);

    expect(events.at(-1)).toEqual({
      type: "done",
      ...STORED_TURN,
    });

    expect(mockStreamReply).toHaveBeenCalledTimes(1);
    expect(mockGenerateReply).not.toHaveBeenCalled();
    expect(mockAppendTurn).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when message and PDFs are both empty", async () => {
    const response = await chatHandler(
      makeJsonRequest({
        message: "",
        conversationId: "conv-1",
      })
    );

    expect(response.status).toBe(400);

    const json = await response.json();

    expect(json.error).toBe("Please enter a message or attach a PDF.");
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  it("returns 400 when message exceeds 1000 characters", async () => {
    const response = await chatHandler(
      makeJsonRequest({
        message: "a".repeat(1001),
        conversationId: "conv-1",
      })
    );

    expect(response.status).toBe(400);
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  it("uses safety override reply without calling generateNutritionReply", async () => {
    mockAnalyzeSafety.mockReturnValue({
      flags: [
        {
          id: "breathing",
          label: "Breathing difficulty",
          severity: "high",
          note: "Possible urgent symptom language detected.",
        },
      ],
      promptBlock: "Safety rules:",
      overrideReply:
        "This sounds like something that should not rely on a chatbot alone.",
    });

    const response = await chatHandler(
      makeJsonRequest({
        message: "I can't breathe",
        conversationId: "conv-1",
      })
    );

    expect(response.status).toBe(200);
    expect(mockGenerateReply).not.toHaveBeenCalled();

    expect(mockAppendTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessage:
          "This sounds like something that should not rely on a chatbot alone.",
        mode: "coach",
      })
    );
  });

  it("forwards study mode preference to buildChatMessages", async () => {
    const response = await chatHandler(
      makeJsonRequest({
        message: "Explain protein digestion",
        conversationId: "conv-1",
        mode: "study",
      })
    );

    expect(response.status).toBe(200);

    await readNdjsonResponse(response);

    expect(mockBuildChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          preferences: expect.objectContaining({
            mode: "study",
          }),
        }),
      })
    );

    expect(mockAppendTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "study",
      })
    );
  });
});