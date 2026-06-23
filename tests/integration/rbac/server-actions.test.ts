/**
 * Integration tests — admin server actions RBAC enforcement
 *
 * These tests verify that every admin server action rejects a request made by
 * a regular user (role: "user") by redirecting to /not-admin BEFORE executing
 * any business logic (database writes, Stripe calls, etc.).
 *
 * Integration scope: the full call chain is exercised —
 *   action → requireAdmin() → auth.api.getSession → role check → redirect
 *
 * Includes course mutations, admin self-enroll, and quiz deletion
 * (`deleteQuiz` from app/actions/quiz).
 * Only the external I/O boundaries (auth, database, Stripe) are mocked.
 *
 * User schema context:
 *   model User { role String? }  — role "user" means a regular user.
 *
 * Baseline tests confirm admin sessions reach mocked Prisma/Stripe success paths.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

// ── Mock declarations (hoisted) ───────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    course: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    chapter: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    lesson: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    lessonDocument: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    lessonVideo: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    enrollment: {
      upsert: vi.fn(),
    },
    quiz: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    quizAnswer: {
      deleteMany: vi.fn(),
    },
    quizAttempt: {
      deleteMany: vi.fn(),
    },
    quizOption: {
      deleteMany: vi.fn(),
    },
    quizQuestion: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    products: { create: vi.fn() },
  },
}));

vi.mock("@/src/generated/prisma/client", () => ({
  EnrollmentStatus: { Active: "Active", Inactive: "Inactive" },
}));

// ── Imports under test ────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Courses — create
import { CreateCourse } from "@/app/admin/courses/create/actions";

// Courses — delete
import { deleteCourse } from "@/app/admin/courses/[courseId]/delete/actions";

// Courses — edit (multiple actions in one file)
import {
  editCourse,
  reorderLessons,
  reorderChapters,
  createChapter,
  createLesson,
  deleteLesson,
  deleteChapter,
} from "@/app/admin/courses/[courseId]/edit/actions";

// Lessons — update
import { updateLesson } from "@/app/admin/courses/[courseId]/[chapterId]/[lessonId]/actions";

// Admin self-enroll
import { adminSelfEnrollCourse } from "@/app/data/admin/admin-self-enroll-course";

// Quiz — delete (invoked from /admin/quizzes UI)
import { deleteQuiz } from "@/app/actions/quiz/delete-quiz";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

// ── Shared fixtures ───────────────────────────────────────────────────────────

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

// Minimal course/lesson/chapter input shapes (validation is never reached
// because requireAdmin() throws before any input parsing occurs)
const COURSE_INPUT = {
  title: "Test Course",
  smallDescription: "Desc",
  description: "Full desc",
  price: 99,
  duration: "2h",
  level: "beginner",
  status: "draft",
  category: "tech",
  fileKey: "key",
  slug: "test-course",
};

const LESSON_INPUT = {
  title: "Test Lesson",
  chapterId: "chapter-1",
  courseId: "course-1",
  description: null,
  content: null,
  videoKey: null,
  youtubeUrl: null,
  thumbnailKey: null,
  isPublished: false,
  isFreePreview: false,
  documents: [],
};

const CHAPTER_INPUT = { name: "Chapter 1", courseId: "course-1" };

/** Valid UUID-backed lesson payload for lessonSchema success-path tests */
const VALID_LESSON = {
  title: "Lesson title here",
  chapterId: "00000000-0000-4000-8000-000000000002",
  courseId: "00000000-0000-4000-8000-000000000001",
  description: "",
  content: "",
  thumbnailKey: "",
  videoKey: "",
  youtubeUrl: "",
  isPublished: true,
  isFreePreview: false,
  documents: [] as [],
};

/** Valid `courseSchema` payload for success-path admin tests */
const VALID_COURSE = {
  title: "A valid course title",
  smallDescription: "Short description for the course card goes here",
  description: "A full course description that is at least three characters long",
  slug: "valid-course-slug",
  category: "Development" as const,
  price: 99,
  duration: 10,
  level: "Beginner" as const,
  status: "Draft" as const,
  fileKey: "file-key-1",
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Runs an action that is expected to throw NEXT_REDIRECT for a "user" role
 * and verifies that:
 *   1. A NEXT_REDIRECT error is thrown (execution is stopped).
 *   2. redirect() was called with "/not-admin".
 */
async function expectUserRoleToBeRejected(
  action: () => Promise<unknown>
): Promise<void> {
  await expect(action()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
}

async function expectLoginRedirectForAction(
  action: () => Promise<unknown>
): Promise<void> {
  await expect(action()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/login");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Admin server actions — unauthenticated (null session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  /** Null session causes requireAdmin() to redirect to /login before the
   *  Stripe product is created or the course record is inserted. */
  it("CreateCourse redirects to /login", async () => {
    await expectLoginRedirectForAction(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CreateCourse(VALID_COURSE as any)
    );
    expect(stripe.products.create).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before
   *  prisma.course.delete is called. */
  it("deleteCourse redirects to /login", async () => {
    await expectLoginRedirectForAction(() => deleteCourse("course-1"));
    expect(prisma.course.delete).not.toHaveBeenCalled();
  });

  /** Null session causes requireAdmin() to redirect to /login before
   *  prisma.quiz.findUnique is called during quiz deletion. */
  it("deleteQuiz redirects to /login", async () => {
    await expectLoginRedirectForAction(() => deleteQuiz("quiz-1"));
    expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
  });
});

describe("Admin server actions — user role access (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  // ── courses/create/actions.ts ─────────────────────────────────────────────

  describe("CreateCourse", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before reaching course creation logic. */
    it('redirects a "user" role to /not-admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expectUserRoleToBeRejected(() => CreateCourse(COURSE_INPUT as any));
    });

    /** requireAdmin() exits before Stripe is called; no product record is
     *  created in Stripe when the caller lacks admin privileges. */
    it("does not call stripe.products.create when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(CreateCourse(COURSE_INPUT as any)).rejects.toThrow();
      expect(stripe.products.create).not.toHaveBeenCalled();
    });

    /** requireAdmin() exits before the Prisma insert; no course row is written
     *  to the database when the caller lacks admin privileges. */
    it("does not create a course record in the database when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(CreateCourse(COURSE_INPUT as any)).rejects.toThrow();
      expect(prisma.course.create).not.toHaveBeenCalled();
    });
  });

  // ── courses/[courseId]/delete/actions.ts ──────────────────────────────────

  describe("deleteCourse", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the delete mutation runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() => deleteCourse("course-1"));
    });

    /** requireAdmin() exits before prisma.course.delete; no course record is
     *  removed when the caller lacks admin privileges. */
    it("does not delete the course record when blocked", async () => {
      await expect(deleteCourse("course-1")).rejects.toThrow();
      expect(prisma.course.delete).not.toHaveBeenCalled();
    });
  });

  // ── courses/[courseId]/edit/actions.ts ────────────────────────────────────

  describe("editCourse", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before any course update logic runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editCourse(COURSE_INPUT as any, "course-1")
      );
    });

    /** requireAdmin() exits before prisma.course.update; no course fields are
     *  changed when the caller lacks admin privileges. */
    it("does not update the course record when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(editCourse(COURSE_INPUT as any, "course-1")).rejects.toThrow();
      expect(prisma.course.update).not.toHaveBeenCalled();
    });
  });

  describe("reorderLessons", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before any lesson reorder transaction runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() =>
        reorderLessons(
          "chapter-1",
          [{ id: "lesson-1", position: 1 }],
          "course-1"
        )
      );
    });

    /** requireAdmin() exits before the transaction that updates lesson positions;
     *  no position changes are persisted when the caller lacks admin privileges. */
    it("does not call prisma.$transaction when blocked", async () => {
      await expect(
        reorderLessons("chapter-1", [{ id: "lesson-1", position: 1 }], "course-1")
      ).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("reorderChapters", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before any chapter reorder logic runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() =>
        reorderChapters("course-1", [{ id: "chapter-1", position: 1 }])
      );
    });

    /** requireAdmin() exits before prisma.$transaction; chapter positions are not
     *  updated when the caller lacks admin privileges. */
    it("does not call prisma.$transaction when blocked", async () => {
      await expect(
        reorderChapters("course-1", [{ id: "chapter-1", position: 1 }])
      ).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("createChapter", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the chapter creation transaction runs. */
    it('redirects a "user" role to /not-admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expectUserRoleToBeRejected(() => createChapter(CHAPTER_INPUT as any));
    });

    /** requireAdmin() exits before prisma.chapter.create; no chapter record is
     *  inserted when the caller lacks admin privileges. */
    it("does not create a chapter record when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(createChapter(CHAPTER_INPUT as any)).rejects.toThrow();
      expect(prisma.chapter.create).not.toHaveBeenCalled();
    });
  });

  describe("createLesson", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the lesson creation transaction runs. */
    it('redirects a "user" role to /not-admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expectUserRoleToBeRejected(() => createLesson(LESSON_INPUT as any));
    });

    /** requireAdmin() exits before the lesson-creation transaction; no lesson
     *  or document records are inserted when the caller lacks admin privileges. */
    it("does not create a lesson record when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(createLesson(LESSON_INPUT as any)).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("deleteLesson", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before any lesson lookup or deletion runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() =>
        deleteLesson({
          chapterId: "chapter-1",
          courseId: "course-1",
          lessonId: "lesson-1",
        })
      );
    });

    /** requireAdmin() exits before the chapter lookup that precedes deletion;
     *  no lesson records are queried or removed when the caller lacks admin privileges. */
    it("does not query or delete lesson records when blocked", async () => {
      await expect(
        deleteLesson({
          chapterId: "chapter-1",
          courseId: "course-1",
          lessonId: "lesson-1",
        })
      ).rejects.toThrow();
      expect(prisma.chapter.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("deleteChapter", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before any chapter lookup or deletion runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() =>
        deleteChapter({ chapterId: "chapter-1", courseId: "course-1" })
      );
    });

    /** requireAdmin() exits before the course lookup that precedes deletion;
     *  no chapter records are queried or removed when the caller lacks admin privileges. */
    it("does not query or delete chapter records when blocked", async () => {
      await expect(
        deleteChapter({ chapterId: "chapter-1", courseId: "course-1" })
      ).rejects.toThrow();
      expect(prisma.course.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── courses/[courseId]/[chapterId]/[lessonId]/actions.ts ──────────────────

  describe("updateLesson", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the lesson update transaction runs. */
    it('redirects a "user" role to /not-admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expectUserRoleToBeRejected(() => updateLesson(LESSON_INPUT as any, "lesson-1"));
    });

    /** requireAdmin() exits before the update transaction; no lesson fields or
     *  documents are modified when the caller lacks admin privileges. */
    it("does not perform any database writes when blocked", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(updateLesson(LESSON_INPUT as any, "lesson-1")).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── actions/quiz/delete-quiz.ts (used from /admin/quizzes) ───────────────────

  describe("deleteQuiz", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the quiz lookup or deletion runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() => deleteQuiz("quiz-1"));
    });

    /** requireAdmin() exits before prisma.quiz.findUnique; no quiz data is
     *  read or deleted when the caller lacks admin privileges. */
    it("does not query prisma.quiz when blocked", async () => {
      await expect(deleteQuiz("quiz-1")).rejects.toThrow();
      expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── data/admin/admin-self-enroll-course.ts ────────────────────────────────

  describe("adminSelfEnrollCourse", () => {
    /** Authenticated non-admin is caught by requireAdmin() and redirected to
     *  /not-admin before the enrollment upsert runs. */
    it('redirects a "user" role to /not-admin', async () => {
      await expectUserRoleToBeRejected(() => adminSelfEnrollCourse("course-1"));
    });

    /** requireAdmin() exits before prisma.enrollment.upsert; no enrollment row
     *  is created or updated when the caller lacks admin privileges. */
    it("does not upsert an enrollment record when blocked", async () => {
      await expect(adminSelfEnrollCourse("course-1")).rejects.toThrow();
      expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Baseline: admin role is allowed ───────────────────────────────────────

  describe("baseline — admin role IS allowed", () => {
    /** Sanity check: role "admin" passes requireAdmin() without a redirect;
     *  deleteCourse proceeds to the DB call, confirming the gate is correctly bypassed. */
    it('does NOT throw for a user with role "admin" (sanity check)', async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      // deleteCourse is lightweight — it doesn't hit Stripe, just DB.
      // Mock the DB call so it doesn't throw.
      vi.mocked(prisma.course.delete).mockResolvedValue({} as never);


      // The action should succeed (not throw a redirect)
      await expect(deleteCourse("course-1")).resolves.not.toThrow();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    /** Full success path for CreateCourse: Stripe creates a product and Prisma
     *  inserts the course record; no redirect is issued for a valid admin session. */
    it("CreateCourse succeeds for admin with valid payload (mocked Stripe + Prisma)", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(stripe.products.create).mockResolvedValue({
        default_price: "price_test",
      } as never);
      vi.mocked(prisma.course.create).mockResolvedValue({} as never);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await CreateCourse(VALID_COURSE as any);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Course created successfully",
      });
      expect(prisma.course.create).toHaveBeenCalled();
    });

    /** editCourse success path: admin with valid input and a mocked Prisma update
     *  receives a success response without any redirect. */
    it("editCourse succeeds for admin when update resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);


      vi.mocked(prisma.course.update).mockResolvedValue({} as never);

      const courseId = "00000000-0000-4000-8000-000000000001";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await editCourse(VALID_COURSE as any, courseId);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Course updated successfully",
      });
    });

    /** createChapter success path: admin with valid input and a mocked transaction
     *  receives a success response; confirms the chapter insert is reached. */
    it("createChapter succeeds for admin when transaction resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          chapter: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as never);
      });

      const chapterInput = {
        title: "New chapter title",
        courseId: "00000000-0000-4000-8000-000000000001",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createChapter(chapterInput as any);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Chapter created successfully",
      });
    });

    /** reorderLessons batches prisma.lesson.update calls inside $transaction. */
    it("reorderLessons succeeds for admin when transaction resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
      vi.mocked(prisma.lesson.update).mockResolvedValue({} as never);

      const courseId = "00000000-0000-4000-8000-000000000001";
      const chapterId = "00000000-0000-4000-8000-000000000002";
      const lessonId = "00000000-0000-4000-8000-000000000010";

      const result = await reorderLessons(
        chapterId,
        [{ id: lessonId, position: 1 }],
        courseId
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Lessons reordered successfully",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** reorderChapters batches prisma.chapter.update calls inside $transaction. */
    it("reorderChapters succeeds for admin when transaction resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);
      vi.mocked(prisma.chapter.update).mockResolvedValue({} as never);

      const courseId = "00000000-0000-4000-8000-000000000001";
      const chapterId = "00000000-0000-4000-8000-000000000020";

      const result = await reorderChapters(courseId, [
        { id: chapterId, position: 1 },
      ]);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Chapters reordered successfully",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** createLesson validates against lessonSchema then creates row (+ docs) in tx. */
    it("createLesson succeeds for admin when transaction resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          lesson: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "new-lesson" }),
          },
          lessonDocument: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return fn(tx as never);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createLesson(VALID_LESSON as any);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Lesson created successfully",
      });
    });

    /** deleteLesson loads chapter lesson ordering, compacts positions, deletes row. */
    it("deleteLesson succeeds for admin when chapter contains the lesson", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      const lessonId = "00000000-0000-4000-8000-000000000010";
      const chapterId = "00000000-0000-4000-8000-000000000002";
      const courseId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(prisma.chapter.findUnique).mockResolvedValue({
        lessons: [{ id: lessonId, position: 1 }],
      } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const result = await deleteLesson({
        chapterId,
        courseId,
        lessonId,
      });

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Lesson deleted and positions reordered successfully",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** deleteChapter loads course chapter ordering, compacts positions, deletes row. */
    it("deleteChapter succeeds for admin when course contains the chapter", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      const chapterId = "00000000-0000-4000-8000-000000000020";
      const courseId = "00000000-0000-4000-8000-000000000001";

      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        chapters: [{ id: chapterId, position: 1 }],
      } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const result = await deleteChapter({ chapterId, courseId });

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Chapter deleted and positions reordered successfully",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** updateLesson wipes/rebuilds lesson documents then updates lesson metadata. */
    it("updateLesson succeeds for admin when transaction resolves", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          lesson: {
            update: vi.fn().mockResolvedValue({ id: "lesson-1" }),
          },
          lessonDocument: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          lessonVideo: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as never);
      });

      const lessonId = "00000000-0000-4000-8000-000000000010";
      
      const result = await updateLesson(VALID_LESSON as never, lessonId);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Lesson updated successfully",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** deleteQuiz removes answers, attempts, options, questions, then quiz row. */
    it("deleteQuiz succeeds for admin when quiz exists", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ id: "quiz-1" } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const result = await deleteQuiz("quiz-1");

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Quiz deleted successfully.",
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    /** adminSelfEnrollCourse upserts an Active enrollment linking admin ↔ course. */
    it("adminSelfEnrollCourse succeeds for admin when course exists", async () => {
      const adminSession = {
        ...USER_SESSION,
        user: { ...USER_SESSION.user, id: "admin-1", role: "admin" },
      };
      mockGetSession.mockResolvedValue(adminSession);

      const courseId = "00000000-0000-4000-8000-000000000001";
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: courseId,
        price: 49,
      } as never);
      vi.mocked(prisma.enrollment.upsert).mockResolvedValue({} as never);

      const result = await adminSelfEnrollCourse(courseId);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "You are now enrolled in this course.",
      });
      expect(prisma.enrollment.upsert).toHaveBeenCalled();
    });
  });
});

