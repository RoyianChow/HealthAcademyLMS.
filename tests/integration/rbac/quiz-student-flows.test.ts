/**
 * Integration tests — quiz student actions (ownership + unauthenticated submit)
 *
 * Covers deleteQuizAttempt (ownership enforcement) and submitQuizAttempt
 * (unauthenticated, wrong ownership, success grading, and admin delete limits).
 *
 * The unauthenticated submitQuizAttempt redirect is also covered in
 * user-actions-unauthenticated.test.ts for broader sweeps.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    quizAttempt: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    quizAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
    quiz: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteQuizAttempt } from "@/app/actions/quiz/delete-quiz-attempt";
import { submitQuizAttempt } from "@/app/quizzes/[quizId]/action";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

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

const ADMIN_SESSION = {
  ...USER_SESSION,
  user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
  session: { ...USER_SESSION.session, userId: "admin-1" },
};

describe("deleteQuizAttempt — ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  /** findFirst is scoped to userId so it returns null for an attempt belonging
   *  to a different user; the action returns an error without touching transactions. */
  it("returns error when attempt belongs to another user", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await deleteQuizAttempt("attempt-other");

    expect(result).toEqual({ status: "error", message: "Attempt not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  /** Happy path: findFirst returns the attempt owned by the caller;
   *  a transaction deletes the answers and the attempt record. */
  it("deletes when attempt belongs to the caller", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await deleteQuizAttempt("attempt-1");

    expect(result).toEqual({ status: "success" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("deleteQuizAttempt — admin cannot delete another user's attempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);
  });

  /** deleteQuizAttempt scopes findFirst to session.user.id; admins have no
   *  elevated delete — attempting another learner's attemptId yields the same
   *  "not found" shape as a normal user cross-delete try. */
  it("returns Attempt not found when admin session targets someone else's attemptId", async () => {
    const result = await deleteQuizAttempt("attempt-owned-by-student");

    expect(result).toEqual({ status: "error", message: "Attempt not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("submitQuizAttempt — unauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  /** requireUser() halts execution before any Prisma call; unauthenticated
   *  users cannot submit quiz answers.
   *  NOTE: the same assertion is also present in user-actions-unauthenticated.test.ts. */
  it("redirects to /login", async () => {
    await expect(
      submitQuizAttempt({
        quizId: "q1",
        attemptId: "a1",
        answers: [],
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.quizAttempt.findFirst).not.toHaveBeenCalled();
  });
});

describe("submitQuizAttempt — wrong ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);
  });

  /** findFirst is scoped to the caller's userId; if the attempt ID belongs to
   *  another user (or does not exist), a structured error is returned instead
   *  of processing the submission. */
  it("returns error when attempt is not found for this user", async () => {
    const result = await submitQuizAttempt({
      quizId: "q1",
      attemptId: "a1",
      answers: [],
    });

    expect(result).toEqual({
      status: "error",
      message: "Attempt not found or already submitted.",
    });
  });
});

describe("submitQuizAttempt — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  /** Full grading path: valid attempt + matching answers persist via transaction
   *  and return score / passed summary for the UI. */
  it("grades submission and returns success when answers match quiz questions", async () => {
    vi.mocked(prisma.quizAnswer.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.quizAnswer.createMany).mockResolvedValue({ count: 1 } as never);
    const questionId = "11111111-1111-4111-8111-111111111111";
    const optCorrect = "22222222-2222-4222-8222-222222222222";
    const optWrong = "33333333-3333-4333-8333-333333333333";

    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      userId: "user-123",
      isComplete: false,
      createdAt: new Date("2026-01-01T12:00:00Z"),
      quiz: {
        id: "quiz-1",
        passingScore: 0,
        timeLimitMinutes: null,
        questions: [
          {
            id: questionId,
            position: 1,
            options: [
              { id: optCorrect, position: 1, isCorrect: true },
              { id: optWrong, position: 2, isCorrect: false },
            ],
          },
        ],
      },
    } as never);

    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [{ questionId, selectedOptionId: optCorrect }],
    });

    expect(result).toMatchObject({
      status: "success",
      score: 100,
      passed: true,
      totalQuestions: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
