/**
 * Unit tests — Next.js middleware RBAC behaviour
 *
 * The middleware provides the first layer of protection for /admin routes:
 *   • /admin paths require an active session cookie.
 *   • If no session cookie exists, user is redirected to /login.
 *   • Role checking is NOT done in middleware.
 *
 * Role enforcement is delegated to requireAdmin() inside admin pages/actions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

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

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import middleware from "@/middleware";

const mockGetSessionCookie = vi.mocked(getSessionCookie);
const mockRedirect = vi.mocked(NextResponse.redirect);
const mockNext = vi.mocked(NextResponse.next);

function buildRequest(pathname: string): NextRequest {
  return {
    nextUrl: {
      pathname,
    },
    url: `http://localhost:3000${pathname}`,
  } as unknown as NextRequest;
}

function runMiddleware(pathname: string) {
  return middleware(buildRequest(pathname));
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("non-admin routes", () => {
    it.each([
      ["/"],
      ["/login"],
      ["/dashboard"],
      ["/profile"],
      ["/api/some-endpoint"],
      ["/adminxyz"],
    ])("passes %s through without checking session", async (pathname) => {
      await runMiddleware(pathname);

      expect(mockGetSessionCookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("/admin routes without session cookie", () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue(null);
    });

    it.each([
      ["/admin"],
      ["/admin/courses"],
      ["/admin/courses/create"],
      ["/admin/courses/course-abc/edit"],
      ["/admin/courses/course-abc/delete"],
      ["/admin/quizzes"],
      ["/admin/quizzes/create"],
      ["/admin/quizzes/quiz-abc/edit"],
    ])("redirects %s to /login", async (pathname) => {
      await runMiddleware(pathname);

      expect(mockGetSessionCookie).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledOnce();

      const redirectArg = mockRedirect.mock.calls[0][0] as URL;
      expect(redirectArg.pathname).toBe("/login");

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("/admin routes with session cookie", () => {
    beforeEach(() => {
      mockGetSessionCookie.mockReturnValue("valid-session-cookie-value");
    });

    it.each([
      ["/admin"],
      ["/admin/courses"],
      ["/admin/quizzes"],
      ["/admin/quizzes/quiz-abc/edit"],
    ])("allows %s through", async (pathname) => {
      await runMiddleware(pathname);

      expect(mockGetSessionCookie).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("does not check user role in middleware", async () => {
      mockGetSessionCookie.mockReturnValue("regular-user-session-cookie");

      await runMiddleware("/admin/courses");

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});