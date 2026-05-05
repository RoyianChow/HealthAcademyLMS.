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
    /** Non-admin session triggers requireAdmin() to redirect to /not-admin before
     *  prisma.course.findMany executes; the course list is never exposed. */
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
    /** Non-admin session triggers requireAdmin() before the recent-courses query;
     *  the dashboard widget data is never fetched. */
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
    /** Non-admin session triggers requireAdmin() before the single-course lookup;
     *  individual course details are never returned. */
    it("redirects before prisma.course.findUnique", async () => {
      await expectUserBlocked(() => adminGetCourse("course-1"));
      expect(prisma.course.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetLesson (used by lesson edit page)", () => {
    /** Non-admin session triggers requireAdmin() before the lesson lookup;
     *  lesson content and video keys are never exposed to non-admins. */
    it("redirects before prisma.lesson.findUnique", async () => {
      await expectUserBlocked(() => adminGetLesson("lesson-1"));
      expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetEnrollmentStats (used by /admin dashboard chart)", () => {
    /** Non-admin session triggers requireAdmin() before the enrollment aggregation;
     *  enrollment trend data is admin-only. */
    it("redirects before prisma.enrollment.findMany", async () => {
      await expectUserBlocked(() => adminGetEnrollmentStats());
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
    });
  });

  describe("adminGetDashboardStats (used by SectionCards on /admin)", () => {
    /** Non-admin session triggers requireAdmin() before the user/course count
     *  queries; aggregate platform stats are never leaked to regular users. */
    it("redirects before prisma.user.count", async () => {
      await expectUserBlocked(() => adminGetDashboardStats());
      expect(prisma.user.count).not.toHaveBeenCalled();
    });
  });

  describe("adminGetQuiz (used by /admin/quizzes/[id]/edit)", () => {
    /** Non-admin session triggers requireAdmin() before the quiz lookup;
     *  quiz questions and answers are never exposed to non-admins. */
    it("redirects before prisma.quiz.findUnique", async () => {
      await expectUserBlocked(() => adminGetQuiz("quiz-1"));
      expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("adminGetQuizList (used by /admin/quizzes)", () => {
    /** Non-admin session triggers requireAdmin() before the quiz list query;
     *  the quiz management page data is never returned. */
    it("redirects before prisma.quiz.findMany", async () => {
      await expectUserBlocked(() => adminGetQuizList());
      expect(prisma.quiz.findMany).not.toHaveBeenCalled();
    });
  });

  describe("adminGetCoursesForQuizForm (used by /admin/quizzes/create)", () => {
    /** Non-admin session triggers requireAdmin() before the course dropdown query;
     *  available courses are never sent to the quiz creation form. */
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

  /** Null session causes requireAdmin() to redirect to /login before the
   *  course list query; unauthenticated access is rejected at the data layer. */
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

  /** Null session causes requireAdmin() to redirect to /login before the
   *  recent-courses query; the dashboard widget data is never fetched. */
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

  /** Null session causes requireAdmin() to redirect to /login before the
   *  single-course lookup; individual course details are never returned. */
  it("adminGetCourse redirects to /login before prisma.course.findUnique", async () => {
    await expect(adminGetCourse("course-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  lesson lookup; lesson content is never exposed to anonymous requests. */
  it("adminGetLesson redirects to /login before prisma.lesson.findUnique", async () => {
    await expect(adminGetLesson("lesson-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  enrollment aggregation query; stats are never returned. */
  it("adminGetEnrollmentStats redirects to /login before prisma.enrollment.findMany", async () => {
    await expect(adminGetEnrollmentStats()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  count queries; aggregate platform stats are never leaked. */
  it("adminGetDashboardStats redirects to /login before prisma.user.count", async () => {
    await expect(adminGetDashboardStats()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  quiz lookup; quiz data is never returned to anonymous requests. */
  it("adminGetQuiz redirects to /login before prisma.quiz.findUnique", async () => {
    await expect(adminGetQuiz("quiz-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  quiz list query; quiz management data is never returned. */
  it("adminGetQuizList redirects to /login before prisma.quiz.findMany", async () => {
    await expect(adminGetQuizList()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.quiz.findMany).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  course dropdown query; quiz creation form data is never returned. */
  it("adminGetCoursesForQuizForm redirects to /login before prisma.course.findMany", async () => {
    await expect(adminGetCoursesForQuizForm()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  request body is parsed or any Prisma call is made. */
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

  /** requireAdmin() short-circuits before the handler parses the request body
   *  or runs any transaction, confirming the guard runs as the very first step. */
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

describe("Admin data loaders — admin session reaches Prisma (happy path)", () => {
  const ADMIN_SESSION = {
    ...USER_SESSION,
    user: { ...USER_SESSION.user, role: "admin" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
  });

  /** adminGetCourses delays then calls requireAdmin; admin passes and findMany runs. */
  it("adminGetCourses resolves with prisma.course.findMany rows", async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      { id: "c1", title: "Course A" },
    ] as never);

    vi.useFakeTimers();
    const promise = adminGetCourses();
    await vi.runAllTimersAsync();
    const rows = await promise;
    vi.useRealTimers();

    expect(rows).toEqual([{ id: "c1", title: "Course A" }]);
    expect(prisma.course.findMany).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  /** Single-course editor loader returns prisma.course.findUnique payload for admins. */
  it("adminGetCourse returns course payload from prisma", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "course-1",
      title: "Editable",
    } as never);

    const result = await adminGetCourse("course-1");

    expect(result).toMatchObject({ id: "course-1", title: "Editable" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("PATCH /admin/quizzes/[quizId] — admin can update (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      ...USER_SESSION,
      user: { ...USER_SESSION.user, role: "admin" },
    });
  });

  /** Mirrors API quiz PATCH: valid body + chapter guard + transaction succeeds → 200. */
  it("returns 200 JSON success when prisma transaction completes", async () => {
    const courseId = "00000000-0000-4000-8000-000000000001";
    const chapterId = "00000000-0000-4000-8000-000000000002";

    vi.mocked(prisma.chapter.findFirst).mockResolvedValue({ id: chapterId } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        quizQuestion: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        quiz: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return (fn as (t: typeof tx) => Promise<unknown>)(tx);
    });

    const body = {
      title: "Admin route quiz",
      courseId,
      chapterId,
      questions: [
        {
          question: "Pick one",
          options: [
            { text: "Yes", isCorrect: true },
            { text: "No", isCorrect: false },
          ],
        },
      ],
    };

    const req = new Request("http://localhost:3000/admin/quizzes/q1", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    const result = await PATCH(req, {
      params: Promise.resolve({
        quizId: "00000000-0000-4000-8000-000000000099",
      }),
    });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    const json = await result.json();
    expect(json).toEqual({
      success: true,
      message: "Quiz updated successfully",
    });
  });
});
