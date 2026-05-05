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

vi.mock("@/lib/db", () => ({
  prisma: {
    quiz: { findFirst: vi.fn() },
    quizAttempt: { create: vi.fn() },
  },
}));

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
  /** findFirst applies enrollment and publication filters at the DB level;
   *  a non-null result means the user is enrolled in a published course. */
  it("returns quiz when findFirst returns a row (enrolled + published)", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      questions: [],
    } as never);

    const result = await getQuiz("quiz-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("quiz-1");
  });

  /** findFirst returns null when the quiz does not exist or when the user is not
   *  enrolled / the course is unpublished; the loader returns null instead of throwing. */
  it("returns null when quiz is not accessible", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getQuiz("quiz-x")).toBeNull();
  });
});

describe("getOrCreateQuizAttempt", () => {
  /** Quiz is not accessible (not enrolled or unpublished); the function returns
   *  null early without creating an attempt record. */
  it("returns null when quiz is not accessible", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getOrCreateQuizAttempt("quiz-x")).toBeNull();
  });

  /** An in-progress (isComplete=false) attempt already exists; the function
   *  returns it so the user can resume rather than starting a new attempt. */
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

  /** allowMultipleAttempts=false with a completed attempt means the user has
   *  used their single attempt; a blocked result is returned and no new attempt is created. */
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
    });
    expect(prisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  /** First attempt on a single-attempt quiz: allowMultipleAttempts=false with an
   *  empty attempts array must still create attempt #1 (not blocked). */
  it("creates first attempt on single-attempt quiz when no prior attempts exist", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: false,
      attempts: [],
    } as never);
    vi.mocked(prisma.quizAttempt.create).mockResolvedValue({
      id: "first-att",
      attemptNumber: 1,
      createdAt: new Date("2025-06-01"),
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: "first-att",
      attemptNumber: 1,
    });
    expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(1);
  });

  /** No prior attempts exist; a new attempt record is created with attemptNumber=1
   *  so the user can begin the quiz for the first time. */
  it("creates first attempt when none exist", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
      ...minimalQuiz,
      allowMultipleAttempts: true,
      attempts: [],
    } as never);
    vi.mocked(prisma.quizAttempt.create).mockResolvedValue({
      id: "new-att",
      attemptNumber: 1,
      createdAt: new Date("2025-06-01"),
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: "new-att",
      attemptNumber: 1,
    });
    expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(1);
  });

  /** allowMultipleAttempts=true with a prior completed attempt; a new attempt
   *  is created with an incremented attemptNumber so the user can retry. */
  it("creates next attempt when multiple attempts allowed and prior completed", async () => {
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
    vi.mocked(prisma.quizAttempt.create).mockResolvedValue({
      id: "att-2",
      attemptNumber: 2,
      createdAt: new Date(),
    } as never);

    const result = await getOrCreateQuizAttempt("quiz-1");

    expect(result).toMatchObject({
      blocked: false,
      attemptId: "att-2",
      attemptNumber: 2,
    });
    expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(1);
  });
});

describe("getQuizAttemptAccess — allowMultipleAttempts branching", () => {
  /** prisma.quiz.findFirst applies enrollment + publication filters; null means the
   *  caller cannot access the quiz — same default shape as user-data-loaders coverage. */
  it("returns safe defaults when quiz is inaccessible (findFirst null)", async () => {
    vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

    expect(await getQuizAttemptAccess("quiz-missing")).toEqual({
      canAttempt: false,
      nextAttemptNumber: 1,
      previousAttemptsCount: 0,
    });
  });

  /** No prior attempts on any quiz; the user can attempt it and the next
   *  attempt number defaults to 1. */
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

  /** allowMultipleAttempts=false with one existing attempt; the user is blocked
   *  from retrying and nextAttemptNumber reflects what a new attempt would be. */
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

  /** allowMultipleAttempts=true with one completed attempt; the user can start
   *  another attempt and nextAttemptNumber is incremented. */
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
