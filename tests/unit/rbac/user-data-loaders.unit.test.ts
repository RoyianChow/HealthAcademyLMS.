/**
 * Unit tests — student-facing data loaders that use requireUser()
 *
 * Verifies unauthenticated callers are redirected to /login before Prisma runs,
 * and enrollment / access rules for course + quiz loaders.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    enrollment: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    course: { findUnique: vi.fn() },
    lesson: { findUnique: vi.fn(), findFirst: vi.fn() },
    quiz: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/src/generated/prisma/client", () => ({
  EnrollmentStatus: { Active: "Active", Inactive: "Inactive", Pending: "Pending" },
  CourseStatus: { Published: "Published", Draft: "Draft" },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnrolledCourses } from "@/app/data/user/get-enrolled-courses";
import { getCourseSidebarData } from "@/app/data/course/get-course-sidebar-data";
import { getLessonContent } from "@/app/data/course/get-lesson-content";
import { getQuiz } from "@/app/data/quiz/get-quiz";
import { getOrCreateQuizAttempt } from "@/app/data/quiz/get-or-create-quiz-attempt";
import { getQuizAttemptAccess } from "@/app/data/quiz/get-quiz-attempt-access";
import { getEnrolledCourseQuizzes } from "@/app/data/quiz/get-enrolled-course-quizzes";

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

async function expectLoginRedirect(op: () => Promise<unknown>): Promise<void> {
  await expect(op()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/login");
}

describe("User data loaders — unauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it("getEnrolledCourses redirects to /login before prisma.enrollment.findMany", async () => {
    await expectLoginRedirect(() => getEnrolledCourses());
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  it("getCourseSidebarData redirects to /login before prisma.course.findUnique", async () => {
    await expectLoginRedirect(() => getCourseSidebarData("my-course"));
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it("getLessonContent redirects to /login before prisma.lesson.findUnique", async () => {
    await expectLoginRedirect(() => getLessonContent("lesson-1"));
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  it("getQuiz redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getQuiz("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  it("getOrCreateQuizAttempt redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getOrCreateQuizAttempt("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  it("getQuizAttemptAccess redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getQuizAttemptAccess("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  it("getEnrolledCourseQuizzes redirects to /login before prisma.quiz.findMany", async () => {
    await expectLoginRedirect(() => getEnrolledCourseQuizzes());
    expect(prisma.quiz.findMany).not.toHaveBeenCalled();
  });
});

describe("User data loaders — authenticated enrollment rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  describe("getCourseSidebarData", () => {
    it("calls notFound when course slug does not exist", async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

      await expect(getCourseSidebarData("unknown-slug")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it("calls notFound when user has no enrollment for the course", async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        slug: "c1",
        title: "C",
        fileKey: "k",
        duration: "1h",
        level: "beginner",
        category: "x",
        chapters: [],
      } as never);

      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

      await expect(getCourseSidebarData("c1")).rejects.toThrow("NEXT_NOT_FOUND");
      expect(prisma.course.findUnique).toHaveBeenCalled();
      expect(prisma.enrollment.findUnique).toHaveBeenCalled();
    });

    it("calls notFound when enrollment status is Inactive", async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        slug: "c1",
        title: "C",
        fileKey: "k",
        duration: "1h",
        level: "beginner",
        category: "x",
        chapters: [],
      } as never);

      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Inactive",
      } as never);

      await expect(getCourseSidebarData("c1")).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("returns course data when enrollment is Active", async () => {
      const coursePayload = {
        id: "course-1",
        slug: "c1",
        title: "C",
        fileKey: "k",
        duration: "1h",
        level: "beginner",
        category: "x",
        chapters: [],
      };
      vi.mocked(prisma.course.findUnique).mockResolvedValue(coursePayload as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Active",
      } as never);

      const result = await getCourseSidebarData("c1");

      expect(result).toEqual({ course: coursePayload });
    });
  });

  describe("getLessonContent", () => {
    const baseLesson = {
      id: "lesson-1",
      title: "L",
      description: null,
      content: null,
      thumbnailKey: null,
      videoKey: null,
      youtubeUrl: null,
      documents: [],
      position: 1,
      isPublished: false,
      isFreePreview: false,
      lessonProgress: false,
      chapter: {
        courseId: "course-1",
        course: { slug: "slug-a" },
      },
    };

    it("calls notFound when user is not enrolled", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(baseLesson as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

      await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("calls notFound when lesson is unpublished and not free preview", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(baseLesson as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Active",
      } as never);

      await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("returns lesson when enrolled and lesson is published", async () => {
      const published = {
        ...baseLesson,
        isPublished: true,
      };
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(published as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Active",
      } as never);

      const result = await getLessonContent("lesson-1");

      expect(result).toEqual(published);
    });

    it("calls notFound when lesson id does not exist", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);

      await expect(getLessonContent("missing-lesson")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
    });

    it("returns unpublished lesson when enrolled and isFreePreview is true", async () => {
      const freePreview = {
        ...baseLesson,
        isPublished: false,
        isFreePreview: true,
      };
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(freePreview as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Active",
      } as never);

      const result = await getLessonContent("lesson-1");

      expect(result).toEqual(freePreview);
    });
  });

  describe("getQuizAttemptAccess", () => {
    it("returns canAttempt false when quiz is not accessible (e.g. not enrolled)", async () => {
      vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

      const result = await getQuizAttemptAccess("quiz-x");

      expect(result).toEqual({
        canAttempt: false,
        nextAttemptNumber: 1,
        previousAttemptsCount: 0,
      });
    });

    it("returns canAttempt true when allowMultipleAttempts and prior completed attempt", async () => {
      vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
        id: "q1",
        chapterId: "ch1",
        allowMultipleAttempts: true,
        attempts: [{ id: "a1", attemptNumber: 1 }],
      } as never);

      expect(await getQuizAttemptAccess("q1")).toEqual({
        canAttempt: true,
        nextAttemptNumber: 2,
        previousAttemptsCount: 1,
      });
    });

    it("returns canAttempt false when single attempt and prior completed attempt", async () => {
      vi.mocked(prisma.quiz.findFirst).mockResolvedValue({
        id: "q1",
        chapterId: "ch1",
        allowMultipleAttempts: false,
        attempts: [{ id: "a1", attemptNumber: 1 }],
      } as never);

      expect(await getQuizAttemptAccess("q1")).toEqual({
        canAttempt: false,
        nextAttemptNumber: 2,
        previousAttemptsCount: 1,
      });
    });
  });

  describe("getEnrolledCourseQuizzes", () => {
    it("calls prisma.quiz.findMany when session exists", async () => {
      vi.mocked(prisma.quiz.findMany).mockResolvedValue([]);

      const result = await getEnrolledCourseQuizzes();

      expect(result).toEqual([]);
      expect(prisma.quiz.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
