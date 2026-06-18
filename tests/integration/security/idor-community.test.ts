/**
 * Security integration tests — cross-user community isolation (IDOR)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

const mockTx = {
  communityLike: { deleteMany: vi.fn() },
  communityComment: { deleteMany: vi.fn() },
  communityPost: { delete: vi.fn() },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    communityPost: { findUnique: vi.fn() },
    communityComment: { findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteCommunityPost } from "@/app/actions/community/delete-post";
import { deleteCommunityComment } from "@/app/actions/community/delete-comment";
import { banUserAction } from "@/app/actions/community/ban-user";

const mockGetSession = vi.mocked(auth.api.getSession);

const STUDENT_B = {
  user: {
    id: "student-b",
    name: "Student B",
    email: "b@example.com",
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
    id: "sess-b",
    userId: "student-b",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "tok",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

describe("IDOR — community actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(STUDENT_B);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
  });

  it("prevents student B from deleting student A's post", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      id: "post-a",
      userId: "student-a",
    } as never);

    const result = await deleteCommunityPost("post-a");

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to delete this post.",
    });
    expect(mockTx.communityPost.delete).not.toHaveBeenCalled();
  });

  it("prevents student B from deleting student A's comment", async () => {
    vi.mocked(prisma.communityComment.findUnique).mockResolvedValue({
      id: "comment-a",
      userId: "student-a",
      postId: "post-a",
    } as never);

    const result = await deleteCommunityComment("comment-a");

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to delete this comment.",
    });
    expect(prisma.communityComment.delete).not.toHaveBeenCalled();
  });

  it("prevents non-admin users from banning another user", async () => {
    const result = await banUserAction(
      "student-a",
      "Spam",
      new Date(Date.now() + 86400000).toISOString()
    );

    expect(result).toEqual({
      error: "Unauthorized access. Only admins can ban users.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
