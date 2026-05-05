/**
 * Unit tests — Next.js middleware RBAC behaviour
 *
 * The middleware provides the first layer of protection for /admin routes:
 *   • All /admin paths require an active session cookie → redirect to /login
 *     if absent.
 *   • All other paths pass through unconditionally.
 *
 * IMPORTANT FINDING (documented here):
 *   The middleware validates only the *presence* of a session cookie; it does
 *   NOT inspect the user's role.  A regular "user" who has a valid session
 *   cookie will pass through the middleware unchallenged.
 *
 *   Role enforcement is delegated entirely to requireAdmin(), which every admin
 *   page and server action must call explicitly.  The integration tests in
 *   tests/integration/rbac/ confirm that this second layer is in place.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// ── Mock declarations (hoisted before imports) ────────────────────────────────

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url: URL) => ({
      type: "redirect",
      url: url.toString(),
      status: 307,
    })),
    next: vi.fn(() => ({ type: "next" })),
  },
}));

/**
 * Unwrap arcjet's createMiddleware so the inner handler is the default export
 * of middleware.ts, making it directly callable in tests.
 */
vi.mock("@arcjet/next", () => ({
  default: vi.fn(() => ({})),
  createMiddleware: vi.fn(
    (_aj: unknown, handler: (req: NextRequest) => unknown) => handler
  ),
  detectBot: vi.fn(() => ({})),
}));

// ── Imports under test ────────────────────────────────────────────────────────

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import middleware from "@/middleware";

const mockGetSessionCookie = vi.mocked(getSessionCookie);
const mockRedirect = vi.mocked(NextResponse.redirect);
const mockNext = vi.mocked(NextResponse.next);

// ── Helper ────────────────────────────────────────────────────────────────────

function buildRequest(pathname: string): NextRequest {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
  } as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Non-admin routes ───────────────────────────────────────────────────────

  describe("non-admin routes", () => {
    it.each([
      ["/"],
      ["/login"],
      ["/dashboard"],
      ["/profile"],
      ["/api/some-endpoint"],
    ])(
      "passes %s through without inspecting the session cookie",
      async (pathname) => {
        await middleware(buildRequest(pathname));

        expect(mockGetSessionCookie).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    );
  });

  // ── /admin routes — no session cookie ────────────────────────────────────

  describe("/admin routes — no session cookie present", () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue(null);
    });

    it.each([
      ["/admin"],
      ["/admin/courses"],
      ["/admin/courses/create"],
      ["/admin/courses/course-abc/edit"],
      ["/admin/courses/course-abc/delete"],
      ["/admin/courses/course-abc/ch-1/lesson-1"],
      ["/admin/quizzes"],
      ["/admin/quizzes/create"],
      ["/admin/quizzes/quiz-abc/edit"],
    ])(
      "redirects %s to /login when no session cookie exists",
      async (pathname) => {
        await middleware(buildRequest(pathname));

        expect(mockRedirect).toHaveBeenCalledOnce();
        const redirectArg = mockRedirect.mock.calls[0][0] as URL;
        expect(redirectArg.pathname).toBe("/login");
      }
    );

    it("does not call NextResponse.next() for an unauthenticated /admin request", async () => {
      await middleware(buildRequest("/admin/courses"));

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ── /admin routes — session cookie present ────────────────────────────────

  describe("/admin routes — session cookie present", () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue("valid-session-cookie-value");
    });

    it.each([
      ["/admin"],
      ["/admin/courses"],
      ["/admin/quizzes"],
      ["/admin/quizzes/quiz-abc/edit"],
    ])(
      "allows %s through when a session cookie is present",
      async (pathname) => {
        await middleware(buildRequest(pathname));

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    );

    it(
      "does NOT check the role — a regular user's session cookie passes through " +
        "(role enforcement is the responsibility of requireAdmin() in each page/action)",
      async () => {
        // A "user"-role session cookie is structurally identical to an "admin" one;
        // the middleware cannot differentiate them.
        mockGetSessionCookie.mockReturnValue("user-role-session-cookie");

        await middleware(buildRequest("/admin/courses"));

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRedirect).not.toHaveBeenCalled();
      }
    );
  });
});
