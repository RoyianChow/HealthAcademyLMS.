/**
 * Integration tests — API route handlers RBAC enforcement
 *
 * Covers all five admin-only API routes.  For each route a "user"-role session
 * is set up and the test asserts that:
 *   1. The handler throws NEXT_REDIRECT (execution stops immediately).
 *   2. redirect() was called with "/not-admin".
 *   3. No Prisma or S3 operation was reached.
 *
 * Routes under test:
 *   POST   /api/quizzes                        app/api/quizzes/route.ts
 *   PATCH  /api/quizzes/[quizId]               app/api/quizzes/[quizId]/route.ts
 *   POST   /api/s3/upload                      app/api/s3/upload/route.ts
 *   DELETE /api/s3/delete                      app/api/s3/delete/route.ts
 *   POST   /api/lesson-documents/upload        app/api/lesson-documents/upload/route.ts
 *
 * Security fixes applied (all requireAdmin() now live BEFORE the try block):
 *   - POST /api/quizzes          — was missing entirely
 *   - PATCH /api/quizzes/[quizId] — was missing entirely
 *   - POST /api/s3/upload        — was inside try (redirect silently swallowed → 500)
 *
 * The S3 upload regression test duplicates the NEXT_REDIRECT assertion intentionally
 * as a documented guard against moving requireAdmin() back inside try/catch.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

// ── Mock declarations ──────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    chapter: { findFirst: vi.fn() },
    quiz: { create: vi.fn(), update: vi.fn() },
    quizQuestion: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Prevent @t3-oss/env-nextjs from throwing on missing env vars at import time.
vi.mock("@/lib/env", () => ({
  env: {
    ARCJET_KEY: "test-key",
    AWS_REGION: "us-east-1",
    AWS_ENDPOINT_URL_S3: "https://s3.example.com",
    AWS_ACCESS_KEY_ID: "test-access-key-id",
    AWS_SECRET_ACCESS_KEY: "test-secret",
    S3_BUCKET_NAME: "test-bucket",
    NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES: "test-image-bucket",
    NEXT_PUBLIC_S3_PUBLIC_URL: "https://cdn.example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/arcjet", () => ({
  default: {
    withRule: vi.fn().mockReturnValue({
      protect: vi.fn().mockResolvedValue({ isDenied: () => false }),
    }),
  },
  fixedWindow: vi.fn(() => ({})),
}));

// Shared S3 client used by app/api/s3/* routes.
vi.mock("@/lib/S3Client", () => ({
  S3: { send: vi.fn() },
}));

// The lesson-documents route creates its own S3Client instance at module scope.
// Vitest requires a class or function keyword for mocks used with `new`.
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = vi.fn();
  },
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://presigned.example.com/url"),
}));

// ── Imports under test ────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { S3 } from "@/lib/S3Client";

import { POST as createQuizHandler } from "@/app/api/quizzes/route";
import { PATCH as updateQuizHandler } from "@/app/api/quizzes/[quizId]/route";
import { POST as s3UploadHandler } from "@/app/api/s3/upload/route";
import { DELETE as s3DeleteHandler } from "@/app/api/s3/delete/route";
import { POST as lessonDocUploadHandler } from "@/app/api/lesson-documents/upload/route";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);
const mockS3Send = vi.mocked(S3.send);

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

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost:3000/api/test`, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

async function expectBlocked(call: () => Promise<unknown>): Promise<void> {
  await expect(call()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
}

async function expectLoginRedirect(call: () => Promise<unknown>): Promise<void> {
  await expect(call()).rejects.toThrow("NEXT_REDIRECT");
  expect(mockRedirect).toHaveBeenCalledWith("/login");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("API routes — unauthenticated (null session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  /** Null session triggers requireAdmin() to redirect to /login before any DB
   *  call; no chapter or quiz lookup is performed. */
  it("POST /api/quizzes redirects to /login", async () => {
    await expectLoginRedirect(() => createQuizHandler(makeRequest("POST", {})));
    expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
  });

  /** Null session triggers requireAdmin() to redirect to /login before the
   *  quiz update handler reads the request body or queries Prisma. */
  it("PATCH /api/quizzes/[quizId] redirects to /login", async () => {
    await expectLoginRedirect(() =>
      updateQuizHandler(makeRequest("PATCH", {}), {
        params: Promise.resolve({ quizId: "quiz-1" }),
      })
    );
  });

  /** Null session triggers requireAdmin() to redirect to /login before the
   *  S3 presigned-URL generation; S3.send is never called. */
  it("POST /api/s3/upload redirects to /login", async () => {
    await expectLoginRedirect(() =>
      s3UploadHandler(
        makeRequest("POST", { fileName: "f.png", contentType: "image/png", size: 1 })
      )
    );
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  /** Null session triggers requireAdmin() to redirect to /login before the
   *  S3 object deletion; S3.send is never called. */
  it("DELETE /api/s3/delete redirects to /login", async () => {
    await expectLoginRedirect(() =>
      s3DeleteHandler(makeRequest("DELETE", { key: "k" }))
    );
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  /** Null session triggers requireAdmin() to redirect to /login before the
   *  lesson-document presigned-URL generation. */
  it("POST /api/lesson-documents/upload redirects to /login", async () => {
    await expectLoginRedirect(() =>
      lessonDocUploadHandler(
        makeRequest("POST", { fileName: "d.pdf", contentType: "application/pdf" })
      )
    );
  });
});

describe("API routes — user role RBAC (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(USER_SESSION);
  });

  // ── POST /api/quizzes ──────────────────────────────────────────────────────

  describe("POST /api/quizzes — create quiz", () => {
    /** Authenticated non-admin triggers requireAdmin() to redirect to /not-admin
     *  before the quiz creation handler processes the request. */
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() => createQuizHandler(makeRequest("POST", {})));
    });

    /** requireAdmin() exits before any DB call; neither chapter nor quiz tables
     *  are touched when the caller lacks admin privileges. */
    it("does not touch the database when blocked", async () => {
      await expect(
        createQuizHandler(makeRequest("POST", {}))
      ).rejects.toThrow();
      expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /api/quizzes/[quizId] ───────────────────────────────────────────

  describe("PATCH /api/quizzes/[quizId] — update quiz", () => {
    /** Authenticated non-admin triggers requireAdmin() to redirect to /not-admin
     *  before the quiz update handler runs. */
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        updateQuizHandler(makeRequest("PATCH", {}), {
          params: Promise.resolve({ quizId: "quiz-1" }),
        })
      );
    });

    /** requireAdmin() exits before the transaction that replaces quiz questions;
     *  no chapter or quiz data is read or modified. */
    it("does not touch the database when blocked", async () => {
      await expect(
        updateQuizHandler(makeRequest("PATCH", {}), {
          params: Promise.resolve({ quizId: "quiz-1" }),
        })
      ).rejects.toThrow();
      expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── POST /api/s3/upload ───────────────────────────────────────────────────

  describe("POST /api/s3/upload — generate presigned upload URL", () => {
    /** Authenticated non-admin triggers requireAdmin() to redirect to /not-admin
     *  before the presigned-URL generation runs. */
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        s3UploadHandler(makeRequest("POST", { fileName: "f.png", contentType: "image/png", size: 1024 }))
      );
    });

    /** requireAdmin() exits before S3.send is called; no presigned URL is
     *  generated and no S3 operation is initiated. */
    it("does not call S3 when blocked", async () => {
      await expect(
        s3UploadHandler(makeRequest("POST", {}))
      ).rejects.toThrow();
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    /** Regression test: requireAdmin() used to be placed inside a try block,
     *  which caused the NEXT_REDIRECT throw to be caught and returned as a 500.
     *  The fix moves requireAdmin() before the try block so the throw propagates.
     *  NOTE: this assertion is functionally identical to the "throws NEXT_REDIRECT"
     *  test above — its value is purely documentary as a regression marker. */
    it(
      "previously: requireAdmin was inside try so a redirect was caught " +
        "and returned as a 500 — this is now fixed",
      async () => {
        // The old behaviour swallowed the redirect and returned a 500 response.
        // The correct behaviour is to propagate the NEXT_REDIRECT throw.
        await expect(
          s3UploadHandler(makeRequest("POST", {}))
        ).rejects.toThrow("NEXT_REDIRECT");
      }
    );
  });

  // ── DELETE /api/s3/delete ─────────────────────────────────────────────────

  describe("DELETE /api/s3/delete — delete S3 object", () => {
    /** Authenticated non-admin triggers requireAdmin() to redirect to /not-admin
     *  before the S3 object deletion runs. */
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() => s3DeleteHandler(makeRequest("DELETE", { key: "some/key" })));
    });

    /** requireAdmin() exits before S3.send is called; no object is deleted from
     *  storage when the caller lacks admin privileges. */
    it("does not call S3.send when blocked", async () => {
      await expect(
        s3DeleteHandler(makeRequest("DELETE", { key: "some/key" }))
      ).rejects.toThrow();
      expect(mockS3Send).not.toHaveBeenCalled();
    });
  });

  // ── POST /api/lesson-documents/upload ─────────────────────────────────────

  describe("POST /api/lesson-documents/upload — generate presigned lesson-doc URL", () => {
    /** Authenticated non-admin triggers requireAdmin() to redirect to /not-admin
     *  before the presigned-URL generation for lesson documents runs. */
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        lessonDocUploadHandler(
          makeRequest("POST", { fileName: "doc.pdf", contentType: "application/pdf" })
        )
      );
    });

    /** requireAdmin() exits before getSignedUrl is called; no presigned URL is
     *  generated for lesson documents when the caller lacks admin privileges. */
    it("does not generate a presigned URL when blocked", async () => {
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      await expect(
        lessonDocUploadHandler(makeRequest("POST", {}))
      ).rejects.toThrow();
      expect(getSignedUrl).not.toHaveBeenCalled();
    });
  });

  // ── Admin role allowed (sanity check) ─────────────────────────────────────

  describe("baseline — admin role IS allowed", () => {
    /** Sanity check: role "admin" passes requireAdmin(); the handler proceeds to
     *  the chapter lookup and returns a 400 (missing chapter) rather than a redirect. */
    it("POST /api/quizzes: does not redirect for role \"admin\"", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });
      // Prisma will throw (no real DB) but the key assertion is no redirect.
      vi.mocked(prisma.chapter.findFirst).mockResolvedValue(null);

      const result = await createQuizHandler(
        makeRequest("POST", { title: "T", courseId: "c", chapterId: "ch", questions: [] })
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      // Returns a 400 JSON (missing chapter) — not a redirect
      expect(result.status).toBe(400);
    });

    /** Sanity check: role "admin" passes requireAdmin(); the handler proceeds to
     *  validation and returns a 400 (invalid body) rather than a redirect. */
    it("PATCH /api/quizzes/[quizId]: does not redirect for role \"admin\"", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });

      const result = await updateQuizHandler(
        makeRequest("PATCH", { title: "T", courseId: "c", chapterId: "ch", questions: [] }),
        { params: Promise.resolve({ quizId: "quiz-1" }) }
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      // Returns a 400 (missing questions) — not a redirect
      expect(result.status).toBe(400);
    });

    /** Valid admin PATCH flows past validation, verifies chapter ownership,
     *  runs the transactional quiz rewrite, and returns 200 JSON success. */
    it("PATCH /api/quizzes/[quizId]: admin succeeds with valid body", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });

      const courseId = "00000000-0000-4000-8000-000000000001";
      const chapterId = "00000000-0000-4000-8000-000000000002";

      vi.mocked(prisma.chapter.findFirst).mockResolvedValue({
        id: chapterId,
      } as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          quizQuestion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockResolvedValue({}),
          },
          quizOption: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          quiz: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return (fn as unknown as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const body = {
        title: "Updated quiz",
        courseId,
        chapterId,
        questions: [
          {
            question: "What is 2+2?",
            options: [
              { text: "4", isCorrect: true },
              { text: "5", isCorrect: false },
            ],
          },
        ],
      };

      const result = await updateQuizHandler(makeRequest("PATCH", body), {
        params: Promise.resolve({ quizId: "00000000-0000-4000-8000-000000000099" }),
      });

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json).toEqual({
        status: "success",
        message: "Quiz updated successfully",
      });
    });

    /** Admin success path: the presigned-URL handler returns 200 with a URL
     *  containing "presigned.example.com" from the mocked getSignedUrl. */
    it("POST /api/s3/upload: admin receives presigned URL JSON", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });

      const result = await s3UploadHandler(
        makeRequest("POST", {
          fileName: "pic.png",
          contentType: "image/png",
          size: 1024,
          fileType: "image",
        })
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json.url).toContain("presigned.example.com");
    });

    /** Admin success path: the S3 delete handler calls S3.send once and returns
     *  200; no redirect is issued. */
    it("DELETE /api/s3/delete: admin succeeds and calls S3.send", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });
      mockS3Send.mockResolvedValue(undefined);

      const result = await s3DeleteHandler(
        makeRequest("DELETE", { key: "images/test-key.png" })
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
      expect(mockS3Send).toHaveBeenCalled();
    });

    /** Admin success path: handler returns presigned URL + public file URL + key
     *  from mocked getSignedUrl and env-based CDN prefix. */
    it("POST /api/lesson-documents/upload: admin receives presigned URL", async () => {
      mockGetSession.mockResolvedValue({
        ...USER_SESSION,
        user: { ...USER_SESSION.user, role: "admin" },
      });

      const result = await lessonDocUploadHandler(
        makeRequest("POST", {
          fileName: "doc.pdf",
          contentType: "application/pdf",
        })
      );

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json.url).toContain("presigned.example.com");
      expect(json.fileKey).toMatch(/^lesson-documents\/.+-doc\.pdf$/);
      expect(json.fileUrl).toMatch(/^https:\/\/cdn\.example\.com\/lesson-documents\//);
    });
  });
});
