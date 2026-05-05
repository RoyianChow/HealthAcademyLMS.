/**
 * Unit tests — getCommunityPageData RBAC (extracted from dashboard community page)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    course: { findUnique: vi.fn() },
  },
}));

vi.mock("@/src/generated/prisma/client", () => ({
  CourseStatus: { Published: "Published", Draft: "Draft", Archived: "Archived" },
  EnrollmentStatus: { Active: "Active" },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCommunityPageData } from "@/app/data/community/get-community-page-data";

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

function baseCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "course-1",
    title: "Course",
    slug: "c-slug",
    status: "Published",
    enrollments: [] as { id: string }[],
    communityPosts: [] as unknown[],
    _count: { enrollments: 0, communityPosts: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCommunityPageData — authentication", () => {
  it("redirects to /login when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getCommunityPageData("c-slug")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it("calls notFound when slug is empty/whitespace", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);

    await expect(getCommunityPageData("   ")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it("calls notFound when course does not exist", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    await expect(getCommunityPageData("missing")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("getCommunityPageData — draft and enrollment gates", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  it("notFound for draft course when user is not admin", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(
      baseCourse({ status: "Draft", enrollments: [{ id: "e1" }] }) as never
    );

    await expect(getCommunityPageData("c-slug")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns data for draft course when user is admin (even unenrolled)", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    const course = baseCourse({
      status: "Draft",
      enrollments: [],
    });
    vi.mocked(prisma.course.findUnique).mockResolvedValue(course as never);

    const result = await getCommunityPageData("c-slug");

    expect(result.user.id).toBe("admin-1");
    expect(result.course).toEqual(course);
  });

  it("notFound for published course when user is not enrolled and not admin", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(
      baseCourse({ status: "Published", enrollments: [] }) as never
    );

    await expect(getCommunityPageData("c-slug")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns data for published course when user is admin but not enrolled", async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    const course = baseCourse({ status: "Published", enrollments: [] });
    vi.mocked(prisma.course.findUnique).mockResolvedValue(course as never);

    const result = await getCommunityPageData("c-slug");

    expect(result.course.slug).toBe("c-slug");
  });

  it("returns data for published course when user has active enrollment", async () => {
    const course = baseCourse({
      status: "Published",
      enrollments: [{ id: "e1" }],
    });
    vi.mocked(prisma.course.findUnique).mockResolvedValue(course as never);

    const result = await getCommunityPageData("c-slug");

    expect(result.user.id).toBe("user-123");
    expect(result.course.enrollments).toHaveLength(1);
  });
});
