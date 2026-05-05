/**
 * Integration tests — student server actions reject unauthenticated callers
 *
 * requireUser() must propagate NEXT_REDIRECT to /login (not be swallowed by
 * try/catch in the action).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    communityPost: { create: vi.fn(), findUnique: vi.fn() },
    communityComment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    communityLike: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
    enrollment: { findFirst: vi.fn() },
    quizAttempt: { findFirst: vi.fn() },
    quizAnswer: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
    lesson: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPost } from "@/app/actions/community/create-post";
import { createComment } from "@/app/actions/community/create-comment";
import { toggleLike } from "@/app/actions/community/toggle-like";
import { deleteCommunityPost } from "@/app/actions/community/delete-post";
import { deleteCommunityComment } from "@/app/actions/community/delete-comment";
import { deleteQuizAttempt } from "@/app/actions/quiz/delete-quiz-attempt";
import { submitQuizAttempt } from "@/app/quizzes/[quizId]/action";
import { markLessonComplete } from "@/app/dashboard/[slug]/[lessonId]/actions";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

async function expectLoginRedirect(call: () => Promise<unknown>): Promise<void> {
  await expect(call()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/login");
}

describe("User server actions — unauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it("createPost redirects to /login and does not create a post", async () => {
    await expectLoginRedirect(() =>
      createPost({ content: "hi", courseId: "c1", slug: "s" })
    );
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
  });

  it("createComment redirects to /login", async () => {
    await expectLoginRedirect(() =>
      createComment({ postId: "p1", content: "hi" })
    );
    expect(prisma.communityComment.create).not.toHaveBeenCalled();
  });

  it("toggleLike redirects to /login", async () => {
    await expectLoginRedirect(() => toggleLike("p1"));
    expect(prisma.communityLike.findUnique).not.toHaveBeenCalled();
  });

  it("deleteCommunityPost redirects to /login", async () => {
    await expectLoginRedirect(() => deleteCommunityPost("p1"));
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("deleteCommunityComment redirects to /login", async () => {
    await expectLoginRedirect(() => deleteCommunityComment("c1"));
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("deleteQuizAttempt redirects to /login", async () => {
    await expectLoginRedirect(() => deleteQuizAttempt("a1"));
    expect(prisma.quizAttempt.findFirst).not.toHaveBeenCalled();
  });

  it("submitQuizAttempt redirects to /login", async () => {
    await expectLoginRedirect(() =>
      submitQuizAttempt({
        quizId: "q1",
        attemptId: "a1",
        answers: [],
      })
    );
    expect(prisma.quizAttempt.findFirst).not.toHaveBeenCalled();
  });

  it("markLessonComplete redirects to /login", async () => {
    await expectLoginRedirect(() => markLessonComplete("lesson-1", "slug-a"));
    expect(prisma.lesson.findFirst).not.toHaveBeenCalled();
  });
});
