/**
 * Unit tests — lib/chat/prompt.ts
 *
 * Pure prompt assembly: modes, tones, excerpts, PDF turns, and user context.
 */

import { describe, expect, it } from "vitest";
import { buildChatMessages } from "@/lib/chat/prompt";
import { defaultChatPreferences } from "@/lib/chat/defaults";
import type {
  AttachedPdfContext,
  ChatCourse,
  ChatMessage,
  ChatRuntimeContext,
  RelevantCourseExcerpt,
} from "@/lib/chat/types";

function buildContext(
  overrides: {
    user?: Partial<ChatRuntimeContext["user"]>;
    accessibleCourses?: ChatCourse[];
    activeCourseId?: string | null;
    conversationId?: string;
    preferences?: Partial<ChatRuntimeContext["preferences"]>;
  } = {}
): ChatRuntimeContext {
  return {
    user: {
      id: "user-1",
      name: "Alex Student",
      email: "alex@example.com",
      goals: [],
      dietaryFocus: [],
      enrolledCourseIds: [],
      ...overrides.user,
    },
    accessibleCourses: overrides.accessibleCourses ?? [],
    activeCourseId: overrides.activeCourseId ?? null,
    conversationId: overrides.conversationId ?? "conv-1",
    preferences: {
      ...defaultChatPreferences,
      ...overrides.preferences,
    },
  };
}

const sampleCourse: ChatCourse = {
  id: "course-1",
  title: "Nutrition Basics",
  slug: "nutrition-basics",
  description: "Intro course",
  smallDescription: "Intro",
  category: "Nutrition",
  level: "BEGINNER",
  duration: 5,
  status: "PUBLISHED",
  progress: {
    percentage: 40,
    completedLessons: 2,
    totalLessons: 5,
    isCompleted: false,
  },
  chapters: [],
};

const sampleExcerpt: RelevantCourseExcerpt = {
  courseId: "course-1",
  courseTitle: "Nutrition Basics",
  chapterTitle: "Chapter 1",
  lessonTitle: "Macros",
  excerpt: "Protein supports muscle repair.",
  score: 0.9,
};

const samplePdf: AttachedPdfContext = {
  id: "pdf-1",
  fileName: "meal-plan.pdf",
  extractedText: "Breakfast: oats and berries.",
  pageCount: 2,
  truncated: false,
  sizeBytes: 1024,
  excerptPreview: "Breakfast: oats and berries.",
};

describe("buildChatMessages", () => {
  it("returns system message first", () => {
    const messages = buildChatMessages({
      context: buildContext(),
      question: "What is protein?",
      history: [],
      relevantExcerpts: [],
      attachedPdfs: [],
      safetyPromptBlock: "Safety rules:",
    });

    expect(messages[0]).toEqual(
      expect.objectContaining({ role: "system" })
    );
    expect(messages.at(-1)).toEqual(
      expect.objectContaining({ role: "user", content: "What is protein?" })
    );
  });

  it("inserts history between system and user turns in order", () => {
    const history: ChatMessage[] = [
      {
        id: "h1",
        role: "user",
        content: "Earlier question",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "h2",
        role: "assistant",
        content: "Earlier answer",
        createdAt: "2026-01-01T00:00:01.000Z",
      },
    ];

    const messages = buildChatMessages({
      context: buildContext(),
      question: "Follow-up",
      history,
      relevantExcerpts: [],
      attachedPdfs: [],
      safetyPromptBlock: "Safety rules:",
    });

    expect(messages.map((m) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
    expect(messages[1].content).toBe("Earlier question");
    expect(messages[2].content).toBe("Earlier answer");
  });

  it("uses the question as user content when no PDFs are attached", () => {
    const messages = buildChatMessages({
      context: buildContext(),
      question: "How much water per day?",
      history: [],
      relevantExcerpts: [],
      attachedPdfs: [],
      safetyPromptBlock: "Safety rules:",
    });

    const userTurn = messages.at(-1);
    expect(userTurn?.content).toBe("How much water per day?");
  });

  it("includes attached PDF text in the user turn", () => {
    const messages = buildChatMessages({
      context: buildContext(),
      question: "Summarize this PDF",
      history: [],
      relevantExcerpts: [],
      attachedPdfs: [samplePdf],
      safetyPromptBlock: "Safety rules:",
    });

    const userTurn = messages.at(-1)?.content ?? "";
    expect(userTurn).toContain("Attached PDF text from meal-plan.pdf");
    expect(userTurn).toContain("Breakfast: oats and berries.");
  });

  describe("system prompt preferences", () => {
    const baseParams = {
      history: [] as ChatMessage[],
      relevantExcerpts: [] as RelevantCourseExcerpt[],
      attachedPdfs: [] as AttachedPdfContext[],
      safetyPromptBlock: "Safety rules:",
      question: "Tell me more",
    };

    it.each([
      ["study", "Study mode"],
      ["quick", "Quick mode"],
      ["pdf", "PDF mode"],
      ["coach", "Coach mode"],
    ] as const)("mode %s includes %s", (mode, expected) => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ preferences: { mode } }),
      });

      expect(messages[0].content).toContain(expected);
    });

    it.each([
      ["direct", "direct, efficient tone"],
      ["study", "teaching tone"],
    ] as const)("tone %s includes expected instruction", (tone, expected) => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ preferences: { tone } }),
      });

      expect(messages[0].content).toContain(expected);
    });

    it.each([
      ["concise", "concise"],
      ["detailed", "complete explanation"],
    ] as const)("responseStyle %s is reflected in prompt", (responseStyle, expected) => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ preferences: { responseStyle } }),
      });

      expect(messages[0].content).toContain(expected);
    });

    it("includes strict source mode when strictSourceUse is true", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ preferences: { strictSourceUse: true } }),
      });

      expect(messages[0].content).toContain("Strict source mode is on");
    });

    it("includes PDF focus when pdfScope is focus and strictSourceUse is false", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({
          preferences: { strictSourceUse: false, pdfScope: "focus" },
        }),
      });

      expect(messages[0].content).toContain("PDF focus is on");
    });
  });

  describe("system prompt context blocks", () => {
    const baseParams = {
      history: [] as ChatMessage[],
      attachedPdfs: [] as AttachedPdfContext[],
      safetyPromptBlock: "Safety rules:",
      question: "Help me study",
    };

    it("includes conversation summary when provided", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext(),
        conversationSummary: "User asked about fiber earlier.",
        relevantExcerpts: [],
      });

      expect(messages[0].content).toContain("User asked about fiber earlier.");
    });

    it("omits conversation summary block when summary is null", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext(),
        conversationSummary: null,
        relevantExcerpts: [],
      });

      expect(messages[0].content).not.toContain(
        "Earlier conversation summary"
      );
    });

    it("notes when no relevant excerpts matched", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext(),
        relevantExcerpts: [],
      });

      expect(messages[0].content).toContain("none matched strongly");
    });

    it("formats relevant excerpts with location", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext(),
        relevantExcerpts: [sampleExcerpt],
      });

      expect(messages[0].content).toContain("Relevant course excerpts:");
      expect(messages[0].content).toContain(
        "Nutrition Basics > Chapter 1 > Macros"
      );
      expect(messages[0].content).toContain("Protein supports muscle repair.");
    });

    it("renders accessible courses block even when empty", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ accessibleCourses: [] }),
        relevantExcerpts: [],
      });

      expect(messages[0].content).toContain("Accessible courses:");
    });

    it("includes user goals when present", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({
          user: {
            goals: ["Build better habits", "Eat more vegetables"],
            dietaryFocus: [],
            enrolledCourseIds: [],
          },
        }),
        relevantExcerpts: [],
      });

      expect(messages[0].content).toContain(
        "Goals: Build better habits, Eat more vegetables"
      );
    });

    it("renders user block without empty goal or note lines", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({
          user: {
            goals: [],
            dietaryFocus: [],
            enrolledCourseIds: [],
            notes: undefined,
          },
        }),
        relevantExcerpts: [],
      });

      const userBlock = messages[0].content;
      expect(userBlock).toContain("Current user context:");
      expect(userBlock).not.toMatch(/Goals:\s*$/m);
      expect(userBlock).not.toMatch(/Notes:\s*$/m);
    });

    it("lists accessible courses with progress", () => {
      const messages = buildChatMessages({
        ...baseParams,
        context: buildContext({ accessibleCourses: [sampleCourse] }),
        relevantExcerpts: [],
      });

      expect(messages[0].content).toContain(
        "Nutrition Basics (Nutrition, 40% complete)"
      );
    });
  });
});
