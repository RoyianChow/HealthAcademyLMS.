/**
 * Unit tests — admin read paths & quiz PATCH RBAC
 *
 * Each loader under app/data/admin that backs an app/admin page is exercised
 * in isolation with mocked Prisma and auth.  A session with role "user" must
 * hit redirect("/not-admin") before any database read runs.
 *
 * RSC pages under app/admin that begin with `await requireAdmin()` (for example
 * `/admin/quizzes` and `/admin/quizzes/create`) are not imported directly here
 * because Vitest cannot transform Next.js TSX modules when tsconfig uses
 * `"jsx": "preserve"`.  Their RBAC contract is the same as these data loaders.
 * Also covers PATCH /admin/quizzes/[quizId]: requireAdmin runs before the try
 * block so unauthenticated or non-admin callers never touch Prisma.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    quiz: { findMany: vi.fn(), findUnique: vi.fn() },
    chapter: { findFirst: vi.fn() },
    lesson: { findUnique: vi.fn(), count: vi.fn() },
    enrollment: { findMany: vi.fn() },
    user: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminGetCourses } from "@/app/data/admin/admin-get-courses";
import { adminGetCourse } from "@/app/data/admin/admin-get-course";
import { adminGetLesson } from "@/app/data/admin/admin-get-lesson";
import { adminGetEnrollmentStats } from "@/app/data/admin/admin-get-enrollment-stats";
import { adminGetRecentCourses } from "@/app/data/admin/admin-get-recent-courses";
import { adminGetDashboardStats } from "@/app/data/admin/admin-get-dashboard-stats";
import { adminGetQuiz } from "@/app/data/admin/admin-get-quiz";
import { adminGetQuizList } from "@/app/data/admin/admin-get-quiz-list";
import { adminGetCoursesForQuizForm } from "@/app/data/admin/admin-get-courses-for-quiz-form";
import { PATCH } from "@/app/admin/quizzes/[quizId]/route";

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

async function expectUserBlocked(
  op: () => Promise<unknown>
): Promise<void> {
  await expect(op()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
}

describe("Admin data loaders — non-admin cannot read (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  describe("adminGetCourses (used by /admin/courses)", () => {
    it("redirects before prisma.course.findMany", async () => {
      vi.useFakeTimers();
      const promise = adminGetCourses();
      const assertion = expect(promise).rejects.toThrow("NEXT_REDIRECT");
      await vi.runAllTimersAsync();
      await assertion;
      expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
      expect(prisma.course.findMany).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("adminGetRecentCourses (used by /admin dashboard recent list)", () => {
    it("redirects before prisma.course.findMany", async () => {
      vi.useFakeTimers();
      const promise = adminGetRecentCourses();
      const assertion = expect(promise).rejects.toThrow("NEXT_REDIRECT");
      await vi.runAllTimersAsync();
      await assertion;
      expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
      expect(prisma.course.findMany).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("adminGetCourse (used by /admin/courses/[id]/edit)", () => {
    it("redirects before prisma.course.findUnique", async () => {
      await expectUserBlocked(() => adminGetCourse("course-1"));
      expect(prisma.course.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetLesson (used by lesson edit page)", () => {
    it("redirects before prisma.lesson.findUnique", async () => {
      await expectUserBlocked(() => adminGetLesson("lesson-1"));
      expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetEnrollmentStats (used by /admin dashboard chart)", () => {
    it("redirects before prisma.enrollment.findMany", async () => {
      await expectUserBlocked(() => adminGetEnrollmentStats());
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
    });
  });

  describe("adminGetDashboardStats (used by SectionCards on /admin)", () => {
    it("redirects before prisma.user.count", async () => {
      await expectUserBlocked(() => adminGetDashboardStats());
      expect(prisma.user.count).not.toHaveBeenCalled();
    });
  });

  describe("adminGetQuiz (used by /admin/quizzes/[id]/edit)", () => {
    it("redirects before prisma.quiz.findUnique", async () => {
      await expectUserBlocked(() => adminGetQuiz("quiz-1"));
      expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetQuizList (used by /admin/quizzes)", () => {
    it("redirects before prisma.quiz.findMany", async () => {
      await expectUserBlocked(() => adminGetQuizList());
      expect(prisma.quiz.findMany).not.toHaveBeenCalled();
    });
  });

  describe("adminGetCoursesForQuizForm (used by /admin/quizzes/create)", () => {
    it("redirects before prisma.course.findMany", async () => {
      await expectUserBlocked(() => adminGetCoursesForQuizForm());
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });
  });
});

describe("Admin data loaders — unauthenticated (null session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it("adminGetCourses redirects to /login before prisma.course.findMany", async () => {
    vi.useFakeTimers();
    const promise = adminGetCourses();
    const assertion = expect(promise).rejects.toThrow("NEXT_REDIRECT");
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findMany).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("adminGetRecentCourses redirects to /login before prisma.course.findMany", async () => {
    vi.useFakeTimers();
    const promise = adminGetRecentCourses();
    const assertion = expect(promise).rejects.toThrow("NEXT_REDIRECT");
    await vi.runAllTimersAsync();
    await assertion;
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findMany).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("adminGetCourse redirects to /login before prisma.course.findUnique", async () => {
    await expect(adminGetCourse("course-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it("adminGetLesson redirects to /login before prisma.lesson.findUnique", async () => {
    await expect(adminGetLesson("lesson-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  it("adminGetEnrollmentStats redirects to /login before prisma.enrollment.findMany", async () => {
    await expect(adminGetEnrollmentStats()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  it("adminGetDashboardStats redirects to /login before prisma.user.count", async () => {
    await expect(adminGetDashboardStats()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("adminGetQuiz redirects to /login before prisma.quiz.findUnique", async () => {
    await expect(adminGetQuiz("quiz-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
  });

  it("adminGetQuizList redirects to /login before prisma.quiz.findMany", async () => {
    await expect(adminGetQuizList()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.quiz.findMany).not.toHaveBeenCalled();
  });

  it("adminGetCoursesForQuizForm redirects to /login before prisma.course.findMany", async () => {
    await expect(adminGetCoursesForQuizForm()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });

  it("PATCH /admin/quizzes/[quizId] redirects to /login before prisma", async () => {
    const req = new Request("http://localhost:3000/admin/quizzes/q1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      PATCH(req, { params: Promise.resolve({ quizId: "q1" }) })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
  });
});

describe("PATCH /admin/quizzes/[quizId] — non-admin cannot update (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  it("throws NEXT_REDIRECT before prisma and before reading the request body", async () => {
    const req = new Request("http://localhost:3000/admin/quizzes/q1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      PATCH(req, { params: Promise.resolve({ quizId: "q1" }) })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
    expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
