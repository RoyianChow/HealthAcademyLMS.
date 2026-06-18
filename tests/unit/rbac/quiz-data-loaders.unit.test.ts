// tests/unit/rbac/quiz-data-loaders.unit.test.ts
/**
 * Unit tests — quiz loaders beyond unauthenticated (getQuiz, getOrCreateQuizAttempt, getQuizAttemptAccess)
 *
 * These tests focus on the business logic of quiz access and attempt management
 * for an already-authenticated user.  Unauthenticated path coverage lives in
 * user-data-loaders.unit.test.ts.
 *
 * getQuizAttemptAccess & enrolment-null cases are also partially covered in
 * user-data-loaders.unit.test.ts; this file keeps the quiz-focused behavioural tests together.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    quiz: { findFirst: vi.fn(), update: vi.fn() },
    quizAttempt: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, 
    $transaction: vi.fn(async (args) => {
      // Safely await and unwrap the transaction regardless of array or interactive callback format
      if (typeof args === "function") {
        return await args(mockPrisma);
      }
      if (Array.isArray(args)) {
        return await Promise.all(args);
      }
      return args;
    }),
  };
  return { prisma: mockPrisma };
});

vi.mock("@/src/generated/prisma/client", () => ({
  EnrollmentStatus: { Active: "Active" },
  CourseStatus: { Published: "Published" },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQuiz } from "@/app/data/quiz/get-quiz";
import { getOrCreateQuizAttempt } from "@/app/data/quiz/get-or-create-quiz-attempt";
import { getQuizAttemptAccess } from "@/app/data/quiz/get-quiz-attempt-access";

const mockGetSession = vi.mocked(auth.api.getSession);

const USER_SESSION = {
  user: {
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
  },
  session: {
    id: "session-abc",
    userId: "user-123",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "tok",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

const minimalQuiz = {
  id: "quiz-1",
  title: "Q",
  chapterId: "ch-1",
  allowMultipleAttempts: false,
  timeLimitMinutes: null as number | null,
  course: { id: "c1", title: "C", slug: "slug" },
  chapter: { id: "ch-1", title: "Ch", position: 1 },
  questions: [] as { id: string; question: string; options: { id: string; text: string }[] }[],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(USER_SESSION);
});

describe("getQuiz — enrolled vs gated", () => {
  it("returns quiz when findFirst returns a row (enrolled + published)", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      questions: [],
    } as never);

    const result = await getQuiz("quiz-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("quiz-1");
  });

  it("returns null when quiz is not accessible", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getQuiz("quiz-x")).toBeNull();
  });
});

describe("getOrCreateQuizAttempt", () => {
  it("returns null when quiz is not accessible", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getOrCreateQuizAttempt("quiz-x")).toBeNull();
  });

  it("returns in-progress attempt when latest attempt is incomplete", async () => {
    const started = new Date("2025-01-01");
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      attempts: [
        {
          id: "att-1",
          attemptNumber: 1,
          isComplete: false,
          createdAt: started,
        },
      ],
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: "att-1",
      attemptNumber: 1,
      startedAt: started,
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  it("returns blocked when single attempt already completed", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: false,
      attempts: [
        {
          id: "att-1",
          attemptNumber: 1,
          isComplete: true,
          createdAt: new Date(),
        },
      ],
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: true,
      attemptId: null,
      attemptNumber: 1,
      startedAt: null,
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  it("returns unblocked with null attemptId on single-attempt quiz when no prior attempts exist", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: false,
      attempts: [],
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: null,
      attemptNumber: 1,
      startedAt: null,
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  it("returns unblocked with null attemptId when none exist", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: true,
      attempts: [],
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: null,
      attemptNumber: 1,
      startedAt: null,
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  it("returns unblocked with incremented attemptNumber when multiple attempts allowed and prior completed", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: true,
      attempts: [
        {
          id: "att-1",
          attemptNumber: 1,
          isComplete: true,
          createdAt: new Date(),
        },
      ],
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: null,
      attemptNumber: 2,
      startedAt: null,
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });
});

describe("getQuizAttemptAccess — allowMultipleAttempts branching", () => {
  it("returns safe defaults when quiz is inaccessible (findFirst null)", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getQuizAttemptAccess("quiz-missing")).toEqual({
      canAttempt: false,
      nextAttemptNumber: 1,
      previousAttemptsCount: 0,
    });
  });

  it("returns canAttempt true with nextAttemptNumber 1 when quiz found and no prior completed attempts", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: "quiz-1",
      chapterId: "ch-1",
      allowMultipleAttempts: false,
      attempts: [],
    } as never);

    expect(await getQuizAttemptAccess("quiz-1")).toEqual({
      canAttempt: true,
      nextAttemptNumber: 1,
      previousAttemptsCount: 0,
    });
  });

  it("returns canAttempt false when single attempt and one completed attempt exists", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: "quiz-1",
      chapterId: "ch-1",
      allowMultipleAttempts: false,
      attempts: [{ id: "a1", attemptNumber: 1 }],
    } as never);

    expect(await getQuizAttemptAccess("quiz-1")).toEqual({
      canAttempt: false,
      nextAttemptNumber: 2,
      previousAttemptsCount: 1,
    });
  });

  it("returns canAttempt true with incremented nextAttemptNumber when multiple attempts allowed", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      id: "quiz-1",
      chapterId: "ch-1",
      allowMultipleAttempts: true,
      attempts: [{ id: "a1", attemptNumber: 1 }],
    } as never);

    expect(await getQuizAttemptAccess("quiz-1")).toEqual({
      canAttempt: true,
      nextAttemptNumber: 2,
      previousAttemptsCount: 1,
    });
  });
});
