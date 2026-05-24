// tests/integration/rbac/lesson-actions.test.ts
/**
 * Integration tests — markLessonComplete RBAC
 *
 * Tests the full call chain: action → requireUser() → auth.api.getSession →
 * session check → Prisma enrollment guard → lesson update.
 *
 * Unauthenticated redirect is also asserted in user-actions-unauthenticated.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    lesson: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    enrollment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    lessonProgress: {
      upsert: vi.fn(),
      count: vi.fn(),
    },
    courseProgress: {
      upsert: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markLessonComplete } from "@/app/dashboard/[slug]/[lessonId]/actions";

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

// Rich mock lesson object with required relation hierarchies to avoid property access crashes
const MOCK_LESSON = {
  id: "lesson-1",
  chapter: {
    id: "chapter-1",
    courseId: "course-1",
    course: {
      id: "course-1",
      slug: "course-slug",
    },
  },
};

describe("markLessonComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 👈 Setup safe defaults for lesson counts so it doesn't try to trigger CourseProgress updates
    vi.mocked(prisma.lesson.count).mockResolvedValue(10);
    vi.mocked(prisma.lessonProgress.count).mockResolvedValue(5);
  });

  /** requireUser() is called first; a null session triggers NEXT_REDIRECT to /login
   * before any Prisma query executes. */
  it("redirects unauthenticated callers to /login", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      markLessonComplete("lesson-1", "course-slug")
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.lesson.findFirst).not.toHaveBeenCalled();
  });

  /** findFirst is scoped to the user's id and the course slug, implicitly
   * checking enrollment. A null result means the user is not enrolled (or
   * the lesson does not belong to the course), so access is denied. */
  it("returns error when user is not enrolled in the course for this slug", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

    const result = await markLessonComplete("lesson-1", "course-slug");

    expect(result.status).toBe("error");
    expect(result.message).toContain("Progress tracking features require full course enrollment.");
    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  /** Happy path: enrolled user marks their lesson complete; prisma.lessonProgress.upsert
   * is called with true values and a success status is returned. */
  it("marks complete when lesson exists under slug with active enrollment", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(MOCK_LESSON as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ status: "Active" } as never);
    vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as never);

    const result = await markLessonComplete("lesson-1", "course-slug");

    expect(result.status).toBe("success");
    expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith({
      where: {
        userId_lessonId: {
          userId: "user-123",
          lessonId: "lesson-1",
        },
      },
      update: { completed: true },
      create: { userId: "user-123", lessonId: "lesson-1", completed: true },
    });
  });
});

describe("markLessonComplete — admin with Active enrollment", () => {
  /** requireUser() treats admins as normal users; with a mocked enrolled-lesson
   * row the progress update succeeds the same as for a student account. */
  it("updates lesson progress when admin session passes enrollment guard", async () => {
    mockGetSession.mockResolvedValue({
      ...USER_SESSION,
      user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
    });
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(MOCK_LESSON as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ status: "Active" } as never);
    vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as never);

    const result = await markLessonComplete("lesson-1", "course-slug");

    expect(result.status).toBe("success");
    expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith({
      where: {
        userId_lessonId: {
          userId: "admin-1",
          lessonId: "lesson-1",
        },
      },
      update: { completed: true },
      create: { userId: "admin-1", lessonId: "lesson-1", completed: true },
    });
  });
});

describe("markLessonComplete — idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(MOCK_LESSON as never);
    vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({ status: "Active" } as never);
    vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.lesson.count).mockResolvedValue(10);
    vi.mocked(prisma.lessonProgress.count).mockResolvedValue(5);
  });

  /** Calling mark complete twice still performs update both times; handler does not
   * short-circuit on lessonProgress already true — documents current behaviour. */
  it("calls lessonProgress.upsert again when lesson already marked complete in DB", async () => {
    await markLessonComplete("lesson-1", "course-slug");
    await markLessonComplete("lesson-1", "course-slug");

    expect(prisma.lessonProgress.upsert).toHaveBeenCalledTimes(2);
  });
});
