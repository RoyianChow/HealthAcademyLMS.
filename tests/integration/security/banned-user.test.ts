/**
 * Security integration tests — banned user restrictions
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    quizAttempt: { findFirst: vi.fn() },
    enrollment: { findFirst: vi.fn() },
    communityPost: { create: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { submitQuizAttempt } from "@/app/quizzes/[quizId]/action";
import { createPost } from "@/app/actions/community/create-post";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

const futureBanExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const BANNED_SESSION = {
  user: {
    id: "banned-user",
    name: "Banned User",
    email: "banned@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    role: "user",
    banned: true,
    banReason: "Community violation",
    banExpires: futureBanExpiry,
  },
  session: {
    id: "sess-banned",
    userId: "banned-user",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "tok",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

describe("banned user restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(BANNED_SESSION);
  });

  it("requireUser returns the banned user without redirecting", async () => {
    const user = await requireUser();

    expect(user.banned).toBe(true);
    expect(user.id).toBe("banned-user");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("blocks banned users from creating community posts", async () => {
    const result = await createPost({
      content: "Hello community",
      courseId: "course-1",
      slug: "nutrition-basics",
    });

    expect(result).toEqual({
      error: "You are currently banned from community interactions.",
    });
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
    expect(prisma.enrollment.findFirst).not.toHaveBeenCalled();
  });

  it("does not redirect banned users away from submitQuizAttempt at auth layer", async () => {
    vi.mocked(prisma.quizAttempt.findFirst).mockResolvedValue(null);

    const result = await submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answers: [],
    });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(prisma.quizAttempt.findFirst).toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      message: "Attempt not found or already submitted.",
    });
  });
});
