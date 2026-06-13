/**
 * Security integration tests — cross-user quiz attempt isolation (IDOR)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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
    $transaction: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteQuizAttempt } from "@/app/actions/quiz/delete-quiz-attempt";
import { submitQuizAttempt } from "@/app/quizzes/[quizId]/action";

const mockGetSession = vi.mocked(auth.api.getSession);

function buildSession(userId: string, role = "user") {
  return {
    user: {
      id: userId,
      name: `User ${userId}`,
      email: `${userId}@example.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      role,
      banned: false,
      banReason: null,
      banExpires: null,
    },
    session: {
      id: `session-${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      token: "tok",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  };
}

describe("IDOR — quiz attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(buildSession("student-b"));
  });

  it("prevents student B from submitting student A's attempt", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-owned-by-student-a",
      answers: [],
    });

    expect(result).toEqual({
      status: "error",
      message: "Attempt not found or already submitted.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents student B from deleting student A's attempt", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await deleteQuizAttempt("attempt-owned-by-student-a");

    expect(result).toEqual({ status: "error", message: "Attempt not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents admin from deleting another student's attempt", async () => {
    mockGetSession.mockResolvedValue(buildSession("admin-1", "admin"));
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await deleteQuizAttempt("attempt-owned-by-student-a");

    expect(result).toEqual({ status: "error", message: "Attempt not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
