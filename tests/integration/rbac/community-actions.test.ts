/**
 * Integration tests — community server actions RBAC
 *
 * Covers owner vs other user vs admin for deletes, and enrollment for writes.
 * Admins follow the same enrollment rules as students for create/write actions.
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

  /** Enrollment check via findFirst returns null; createPost is blocked before
   *  communityPost.create is called, protecting courses from non-enrolled spam. */
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

  /** Happy path: enrolled user creates a post; communityPost.create is called
   *  exactly once and a success response is returned. */
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

  /** The post lookup runs first; a null result short-circuits before the
   *  enrollment check to avoid a spurious DB query. */
  it("blocks when post not found", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue(null);

    const result = await createComment({ postId: "p1", content: "c" });

    expect(result).toEqual({ error: "Post not found." });
    expect(prisma.communityComment.create).not.toHaveBeenCalled();
  });

  /** Post exists but the user is not enrolled in the associated course;
   *  commenting is blocked to keep discussions within the enrolled community. */
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

  /** Happy path: post exists and user is enrolled; comment is created and
   *  a success response is returned. */
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

  /** User is not enrolled in the course the post belongs to; the like table
   *  is never consulted to prevent non-enrolled engagement. */
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
  /** Non-owner regular user attempts to delete someone else's post; the userId
   *  mismatch is detected and a permission error is returned without a transaction. */
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

  /** Ownership check passes (userId matches); a transaction cascades the
   *  deletion of likes, comments, and the post itself. */
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

  /** Admin bypasses the ownership check via a role lookup and can delete any
   *  user's post to facilitate content moderation. */
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

  /** The community delete action uses a case-insensitive admin check; "Admin"
   *  (capital A) must also bypass the ownership check. */
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
  /** Non-owner regular user attempts to delete someone else's comment; a
   *  permission error is returned and the delete call is never made. */
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

  /** Ownership check passes (userId matches); the comment is deleted and a
   *  success response is returned. */
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

  /** Admin bypasses the ownership check via a role lookup and can delete any
   *  user's comment to facilitate content moderation. */
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
  /** Missing post short-circuits before the transaction; no side-effecting DB
   *  work is attempted when the target resource does not exist. */
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
  /** Missing comment short-circuits before the delete call; no side-effecting
   *  DB work is attempted when the target resource does not exist. */
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

  /** Post lookup returns null; the like table is never queried and an error
   *  is returned to prevent orphaned like operations. */
  it("returns error when post does not exist", async () => {
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue(null);

    const result = await toggleLike("p-missing");

    expect(result).toEqual({ error: "Post not found." });
    expect(prisma.communityLike.findUnique).not.toHaveBeenCalled();
  });

  /** Enrolled user likes a post for the first time (no existing like row);
   *  communityLike.create is called once and a success response is returned. */
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

  /** Enrolled user unlikes a previously liked post (existing like row found);
   *  communityLike.delete is called once and a success response is returned. */
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
  /** Admins are not exempt from the enrollment requirement for creating posts;
   *  the rule is applied uniformly to keep community discussions within the
   *  enrolled user group even for administrators. */
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

describe("createComment — admin still requires active enrollment", () => {
  /** Same enrollment gate as createPost: admins without an Active enrollment in the
   *  post's course cannot comment, keeping moderation aligned with student rules. */
  it("blocks admin when not enrolled in post course", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    vi.mocked(prisma.communityPost.findUnique).mockResolvedValue({
      courseId: "course-1",
    } as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await createComment({ postId: "p1", content: "hi" });

    expect(result).toEqual({
      error: "You must be enrolled in this course to comment.",
    });
    expect(prisma.communityComment.create).not.toHaveBeenCalled();
  });
});

describe("toggleLike — admin still requires active enrollment", () => {
  /** Admins cannot toggle likes on courses they are not enrolled in — prevents
   *  silent moderation shortcuts from bypassing the enrollment contract. */
  it("blocks admin when not enrolled", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
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
