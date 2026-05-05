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

  it("POST /api/quizzes redirects to /login", async () => {
    await expectLoginRedirect(() => createQuizHandler(makeRequest("POST", {})));
    expect(prisma.chapter.findFirst).not.toHaveBeenCalled();
  });

  it("PATCH /api/quizzes/[quizId] redirects to /login", async () => {
    await expectLoginRedirect(() =>
      updateQuizHandler(makeRequest("PATCH", {}), {
        params: Promise.resolve({ quizId: "quiz-1" }),
      })
    );
  });

  it("POST /api/s3/upload redirects to /login", async () => {
    await expectLoginRedirect(() =>
      s3UploadHandler(
        makeRequest("POST", { fileName: "f.png", contentType: "image/png", size: 1 })
      )
    );
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("DELETE /api/s3/delete redirects to /login", async () => {
    await expectLoginRedirect(() =>
      s3DeleteHandler(makeRequest("DELETE", { key: "k" }))
    );
    expect(mockS3Send).not.toHaveBeenCalled();
  });

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
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() => createQuizHandler(makeRequest("POST", {})));
    });

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
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        updateQuizHandler(makeRequest("PATCH", {}), {
          params: Promise.resolve({ quizId: "quiz-1" }),
        })
      );
    });

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
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        s3UploadHandler(makeRequest("POST", { fileName: "f.png", contentType: "image/png", size: 1024 }))
      );
    });

    it("does not call S3 when blocked", async () => {
      await expect(
        s3UploadHandler(makeRequest("POST", {}))
      ).rejects.toThrow();
      expect(mockS3Send).not.toHaveBeenCalled();
    });

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
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() => s3DeleteHandler(makeRequest("DELETE", { key: "some/key" })));
    });

    it("does not call S3.send when blocked", async () => {
      await expect(
        s3DeleteHandler(makeRequest("DELETE", { key: "some/key" }))
      ).rejects.toThrow();
      expect(mockS3Send).not.toHaveBeenCalled();
    });
  });

  // ── POST /api/lesson-documents/upload ─────────────────────────────────────

  describe("POST /api/lesson-documents/upload — generate presigned lesson-doc URL", () => {
    it('throws NEXT_REDIRECT to /not-admin for role "user"', async () => {
      await expectBlocked(() =>
        lessonDocUploadHandler(
          makeRequest("POST", { fileName: "doc.pdf", contentType: "application/pdf" })
        )
      );
    });

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
    });
  });
});
