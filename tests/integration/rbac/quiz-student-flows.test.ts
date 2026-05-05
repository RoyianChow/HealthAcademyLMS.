/**
 * Integration tests — quiz student actions (ownership + unauthenticated submit)
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
    },
    quizAnswer: { deleteMany: vi.fn() },
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

describe("deleteQuizAttempt — ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  it("returns error when attempt belongs to another user", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await deleteQuizAttempt("attempt-other");

    expect(result).toEqual({ status: "error", message: "Attempt not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

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

describe("submitQuizAttempt — unauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

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
