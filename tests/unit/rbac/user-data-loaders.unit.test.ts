/**
 * Unit tests — student-facing data loaders that use requireUser()
 *
 * Verifies unauthenticated callers are redirected to /login before Prisma runs,
 * and enrollment / access rules for course + quiz loaders.
 *
 * Some getQuizAttemptAccess cases also appear in quiz-data-loaders.unit.test.ts;
 * both files keep overlapping assertions near their respective loader suites.
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
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/src/generated/prisma/client", () => ({
  EnrollmentStatus: { Active: "Active", Inactive: "Inactive", Pending: "Pending" },
  CourseStatus: { Published: "Published", Draft: "Draft" },
  Prisma: {
    join: (values: string[]) => values,
  },
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

  /** requireUser() inside getEnrolledCourses redirects to /login before the
   *  enrollment list query; no enrollment data is returned to anonymous callers. */
  it("getEnrolledCourses redirects to /login before prisma.enrollment.findMany", async () => {
    await expectLoginRedirect(() => getEnrolledCourses());
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  /** requireUser() inside getCourseSidebarData redirects to /login before the
   *  course lookup; the sidebar data (chapters, lessons) is never fetched. */
  it("getCourseSidebarData redirects to /login before prisma.course.findUnique", async () => {
    await expectLoginRedirect(() => getCourseSidebarData("my-course"));
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  /** requireUser() inside getLessonContent redirects to /login before the
   *  lesson lookup; lesson content and video keys are never returned. */
  it("getLessonContent redirects to /login before prisma.lesson.findUnique", async () => {
    await expectLoginRedirect(() => getLessonContent("lesson-1"));
    expect(prisma.lesson.findUnique).not.toHaveBeenCalled();
  });

  /** requireUser() inside getQuiz redirects to /login before the quiz query;
   *  quiz questions are never exposed to unauthenticated callers. */
  it("getQuiz redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getQuiz("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  /** requireUser() inside getOrCreateQuizAttempt redirects to /login before
   *  any Prisma call; no attempt is created or read for anonymous callers. */
  it("getOrCreateQuizAttempt redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getOrCreateQuizAttempt("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  /** requireUser() inside getQuizAttemptAccess redirects to /login before the
   *  quiz access check; canAttempt is never evaluated for anonymous callers. */
  it("getQuizAttemptAccess redirects to /login before prisma.quiz.findFirst", async () => {
    await expectLoginRedirect(() => getQuizAttemptAccess("quiz-1"));
    expect(prisma.quiz.findFirst).not.toHaveBeenCalled();
  });

  /** requireUser() inside getEnrolledCourseQuizzes redirects to /login before
   *  the quiz list query; enrolled-quiz data is never returned. */
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

  describe("getEnrolledCourses", () => {
    /** Logged-in users receive their Active enrollments mapped to course objects;
     *  verifies findMany is scoped to session user id and EnrollmentStatus.Active. */
    it("returns courses for authenticated user with Active enrollments only", async () => {
      const coursePayload = {
        id: "course-1",
        title: "My course",
        smallDescription: "Short",
        fileKey: "k",
        thumbnailKey: null,
        level: "beginner",
        slug: "my-course",
        duration: "2h",
        courseProgress: [],
      };
      vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
        { course: coursePayload },
      ] as never);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          courseId: "course-1",
          totalLessons: 10,
          completedLessons: 4,
        },
      ] as never);

      const result = await getEnrolledCourses();

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-123",
            status: "Active",
          },
        })
      );
      expect(result).toEqual([
        {
          ...coursePayload,
          progress: {
            totalLessons: 10,
            completedLessons: 4,
            progressPercentage: 40,
          },
        },
      ]);
    });
  });

  describe("getCourseSidebarData", () => {
    /** An unknown slug means the course does not exist; notFound() is thrown
     * and the queries reflect that the slug was checked. */
    it("calls notFound when course slug does not exist", async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

      await expect(getCourseSidebarData("unknown-slug")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(prisma.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "unknown-slug" },
        })
      );
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
    });

    /** Course exists but the user has no enrollment row for it; returns isEnrolled: false
     * to support displaying locked sidebars or preview content. */
    it("returns course data with isEnrolled false when user has no enrollment for the course", async () => {
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
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null);

      const result = await getCourseSidebarData("c1");
      
      expect(result).toEqual({ course: coursePayload, isEnrolled: false });
      expect(prisma.course.findUnique).toHaveBeenCalled();
    });

    /** An Inactive enrollment means the user's access has been revoked; the
     * sidebar data is returned with isEnrolled false. */
    it("returns course data with isEnrolled false when enrollment status is Inactive", async () => {
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
        status: "Inactive",
      } as never);
      vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({
        status: "Inactive",
      } as never);

      const result = await getCourseSidebarData("c1");

      expect(result).toEqual({ course: coursePayload, isEnrolled: false });
    });

    /** Happy path: an Active enrollment confirms the user has paid and their
     * access is current; the full sidebar data object is returned with isEnrolled: true. */
    it("returns course data with isEnrolled true when enrollment is Active", async () => {
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
      vi.mocked(prisma.enrollment.findFirst).mockResolvedValue({
        status: "Active",
      } as never);

      const result = await getCourseSidebarData("c1");

      expect(result).toEqual({ course: coursePayload, isEnrolled: true });
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

    /** Lesson exists but user has no enrollment for its course; notFound() is
     *  thrown to block unenrolled access to lesson content. */
    it("calls notFound when user is not enrolled", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(baseLesson as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

      await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    });

    /** User is enrolled but the lesson is not published and is not a free
     *  preview; notFound() prevents access to unreleased content. */
    it("calls notFound when lesson is unpublished and not free preview", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(baseLesson as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Active",
      } as never);

      await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    });

    /** Happy path: enrolled user requests a published lesson; the full lesson
     *  object is returned so the page can render video and content. */
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

    /** An unknown lesson ID short-circuits before the enrollment lookup since
     *  there is no courseId to scope the enrollment query. */
    it("calls notFound when lesson id does not exist", async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(null);

      await expect(getLessonContent("missing-lesson")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
      expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
    });

    /** isFreePreview=true overrides isPublished=false, allowing enrolled users to
     *  access a lesson before it is officially published as a course preview. */
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

    /** getLessonContent requires enrollment.status === Active; Inactive revokes
     *  access to even published lessons, matching the course sidebar contract. */
    it("calls notFound when enrollment status is Inactive", async () => {
      const published = { ...baseLesson, isPublished: true };
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue(published as never);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        status: "Inactive",
      } as never);

      await expect(getLessonContent("lesson-1")).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  describe("getQuizAttemptAccess", () => {
    /** findFirst returns null when the user is not enrolled or the quiz is
     *  inaccessible; the function returns safe defaults rather than throwing. */
    it("returns canAttempt false when quiz is not accessible (e.g. not enrolled)", async () => {
      vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null);

      const result = await getQuizAttemptAccess("quiz-x");

      expect(result).toEqual({
        canAttempt: false,
        nextAttemptNumber: 1,
        previousAttemptsCount: 0,
      });
    });

    /** allowMultipleAttempts=true with a prior completed attempt means the user
     *  can start another attempt; nextAttemptNumber is incremented accordingly.
     *  NOTE: overlaps with a similar case in quiz-data-loaders.unit.test.ts. */
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

    /** allowMultipleAttempts=false with a prior completed attempt means the user
     *  has exhausted their single attempt; canAttempt must be false.
     *  NOTE: overlaps with a similar case in quiz-data-loaders.unit.test.ts. */
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
    /** Happy path: a valid session is present and the Prisma query executes;
     *  verifies the loader actually delegates to prisma.quiz.findMany. */
    it("calls prisma.quiz.findMany when session exists", async () => {
      vi.mocked(prisma.quiz.findMany).mockResolvedValue([]);

      const result = await getEnrolledCourseQuizzes();

      expect(result).toEqual([]);
      expect(prisma.quiz.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
