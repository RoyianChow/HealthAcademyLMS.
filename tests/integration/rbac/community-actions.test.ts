/**
 * Integration tests — community server actions RBAC
 *
 * Covers owner vs other user vs admin for deletes, and enrollment for writes.
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
    user: { findUnique: vi.fn() },
    communityPost: { create: vi.fn(), findUnique: vi.fn() },
    communityComment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    communityLike: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    enrollment: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPost } from "@/app/actions/community/create-post";
import { createComment } from "@/app/actions/community/create-comment";
import { toggleLike } from "@/app/actions/community/toggle-like";
import { deleteCommunityPost } from "@/app/actions/community/delete-post";
import { deleteCommunityComment } from "@/app/actions/community/delete-comment";

const mockGetSession = vi.mocked(auth.api.getSession);

const USER_A = {
  user: {
    id: "user-a",
    name: "User A",
    email: "a@example.com",
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
    id: "sess-a",
    userId: "user-a",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "tok",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

const ADMIN_SESSION = {
  ...USER_A,
  user: { ...USER_A.user, id: "admin-1", role: "admin" },
  session: { ...USER_A.session, userId: "admin-1" },
};

const ADMIN_UPPER_SESSION = {
  ...USER_A,
  user: { ...USER_A.user, id: "admin-2", role: "Admin" },
  session: { ...USER_A.session, userId: "admin-2" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPost — enrollment", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(USER_A);
  });

  it("blocks when user is not actively enrolled", async () => {
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await createPost({
      content: "hello",
      courseId: "course-1",
      slug: "c-slug",
    });

    expect(result).toEqual({
      error: "You must be enrolled in this course to create a post.",
    });
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
  });

  it("succeeds when user has active enrollment", async () => {
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(prisma.communityPost.create).mockResolvedValue({} as never);

    const result = await createPost({
      content: "hello",
      courseId: "course-1",
      slug: "c-slug",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.communityPost.create).toHaveBeenCalledTimes(1);
  });
});

describe("createComment — enrollment", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(USER_A);
  });

  it("blocks when post not found", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue(null);

    const result = await createComment({ postId: "p1", content: "c" });

    expect(result).toEqual({ error: "Post not found." });
    expect(prisma.communityComment.create).not.toHaveBeenCalled();
  });

  it("blocks when not enrolled in post course", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await createComment({ postId: "p1", content: "c" });

    expect(result).toEqual({
      error: "You must be enrolled in this course to comment.",
    });
    expect(prisma.communityComment.create).not.toHaveBeenCalled();
  });

  it("succeeds when enrolled", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(prisma.communityComment.create).mockResolvedValue({} as never);

    const result = await createComment({ postId: "p1", content: "c" });

    expect(result).toEqual({ success: true });
  });
});

describe("toggleLike — enrollment", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(USER_A);
  });

  it("blocks when not enrolled", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await toggleLike("p1");

    expect(result).toEqual({
      error: "You must be enrolled in this course to like posts.",
    });
    expect(prisma.communityLike.findUnique).not.toHaveBeenCalled();
  });
});

describe("deleteCommunityPost", () => {
  it("user cannot delete another user's post", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-b",
    } as never);

    const result = await deleteCommunityPost("p1");

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to delete this post.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("user can delete own post", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-a",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await deleteCommunityPost("p1");

    expect(result).toEqual({
      status: "success",
      message: "Post deleted successfully.",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("admin (role admin) can delete any post", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-b",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await deleteCommunityPost("p1");

    expect(result?.status).toBe("success");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("admin (role Admin casing) can delete any post — community uses case-insensitive check", async () => {
    mockGetSession.mockResolvedValue(ADMIN_UPPER_SESSION);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "Admin" } as never);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-b",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await deleteCommunityPost("p1");

    expect(result?.status).toBe("success");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("deleteCommunityComment", () => {
  it("user cannot delete another user's comment", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityComment.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-b",
      postId: "p1",
    } as never);

    const result = await deleteCommunityComment("c1");

    expect(result).toEqual({
      status: "error",
      message: "You do not have permission to delete this comment.",
    });
    expect(prisma.communityComment.delete).not.toHaveBeenCalled();
  });

  it("user can delete own comment", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityComment.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-a",
      postId: "p1",
    } as never);
    vi.mocked(prisma.communityComment.delete).mockResolvedValue({} as never);

    const result = await deleteCommunityComment("c1");

    expect(result?.status).toBe("success");
    expect(prisma.communityComment.delete).toHaveBeenCalledTimes(1);
  });

  it("admin can delete any comment", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.communityComment.findUnique).mockResolvedValue({
      id: "c1",
      userId: "user-b",
      postId: "p1",
    } as never);
    vi.mocked(prisma.communityComment.delete).mockResolvedValue({} as never);

    const result = await deleteCommunityComment("c1");

    expect(result?.status).toBe("success");
  });
});

describe("deleteCommunityPost — post not found", () => {
  it("returns error and does not run transaction", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue(null);

    const result = await deleteCommunityPost("missing");

    expect(result).toEqual({
      status: "error",
      message: "Post not found.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("deleteCommunityComment — comment not found", () => {
  it("returns error and does not delete", async () => {
    mockGetSession.mockResolvedValue(USER_A);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    vi.mocked(prisma.communityComment.findUnique).mockResolvedValue(null);

    const result = await deleteCommunityComment("missing");

    expect(result).toEqual({
      status: "error",
      message: "Comment not found.",
    });
    expect(prisma.communityComment.delete).not.toHaveBeenCalled();
  });
});

describe("toggleLike — post not found and success paths", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(USER_A);
  });

  it("returns error when post does not exist", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue(null);

    const result = await toggleLike("p-missing");

    expect(result).toEqual({ error: "Post not found." });
    expect(prisma.communityLike.findUnique).not.toHaveBeenCalled();
  });

  it("creates like when enrolled and no existing like", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(prisma.communityLike.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.communityLike.create).mockResolvedValue({} as never);

    const result = await toggleLike("p1");

    expect(result).toEqual({ success: true });
    expect(prisma.communityLike.create).toHaveBeenCalledTimes(1);
  });

  it("deletes like when enrolled and like exists", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(prisma.communityLike.findUnique).mockResolvedValue({
      id: "like-1",
    } as never);
    vi.mocked(prisma.communityLike.delete).mockResolvedValue({} as never);

    const result = await toggleLike("p1");

    expect(result).toEqual({ success: true });
    expect(prisma.communityLike.delete).toHaveBeenCalledTimes(1);
  });
});

describe("createPost — admin still requires active enrollment", () => {
  it("blocks admin when not enrolled in course", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await createPost({
      content: "hello",
      courseId: "course-1",
      slug: "c-slug",
    });

    expect(result).toEqual({
      error: "You must be enrolled in this course to create a post.",
    });
    expect(prisma.communityPost.create).not.toHaveBeenCalled();
  });
});
