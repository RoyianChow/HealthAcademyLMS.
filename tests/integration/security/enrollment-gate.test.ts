/**
 * Security integration tests — lesson access gated by authentication and enrollment
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    lesson: { findUnique: vi.fn() },
    enrollment: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLessonContent } from "@/app/data/course/get-lesson-content";

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

const publishedLesson = {
  id: "lesson-1",
  title: "Lesson 1",
  description: null,
  content: "<p>Content</p>",
  thumbnailKey: null,
  interactiveScript: null,
  videos: [],
  documents: [],
  position: 1,
  isPublished: true,
  isFreePreview: false,
  lessonProgress: [],
  chapter: {
    courseId: "course-1",
    course: { slug: "nutrition-basics" },
  },
};

describe("enrollment gate — getLessonContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findUnique).mockResolvedValue(publishedLesson as never);
  });

  it("redirects unauthenticated users to /login", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  it("blocks access when the user has no enrollment", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

    await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(prisma.enrollment.findUnique).toHaveBeenCalled();
  });

  it("blocks access when enrollment is Pending", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Pending",
    } as never);

    await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("allows access when enrollment is Active", async () => {
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Active",
    } as never);

    const result = await getLessonContent("lesson-1");

    expect(result).toEqual(publishedLesson);
  });
});
