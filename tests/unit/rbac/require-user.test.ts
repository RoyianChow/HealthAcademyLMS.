/**
 * Unit tests — requireUser() RBAC gate
 *
 * requireUser() is used by student-facing loaders and server actions.  It
 * redirects unauthenticated callers to /login and returns session.user for
 * any authenticated session (including admins).
 *
 * Banned-flag behaviour is asserted explicitly: requireUser() does not gate on
 * `banned`; callers receive session.user regardless.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { requireUser } from "@/app/data/user/require-user";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

function buildSession(role: string | null, opts?: { banned?: boolean }) {
  return {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      role,
      banned: opts?.banned ?? false,
      banReason: null,
      banExpires: null,
    },
    session: {
      id: "test-session-id",
      userId: "test-user-id",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      token: "test-token",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  };
}

describe("requireUser()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when there is no active session (unauthenticated)", () => {
    /** Verifies that a null session causes requireUser() to propagate NEXT_REDIRECT,
     *  terminating the action immediately before any protected code runs. */
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    });

    /** Confirms the redirect destination for unauthenticated callers is /login,
     *  prompting the user to sign in rather than showing an authorization error. */
    it("redirects to /login", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    /** requireUser() is role-agnostic; it must never route to /not-admin.
     *  Only requireAdmin() uses that destination. */
    it("does NOT redirect to /not-admin", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/not-admin");
    });
  });

  describe('when the session user has role "user"', () => {
    /** Happy path for a regular user: session.user is returned directly so
     *  callers can use user.id and other fields without an extra getSession call. */
    it("returns the user object without redirecting", async () => {
      const session = buildSession("user");
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result).toEqual(session.user);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    /** Verifies the returned user payload contains the expected id so downstream
     *  code that scopes DB queries to user.id operates on the correct account. */
    it("exposes the correct user id", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      const result = await requireUser();

      expect(result.id).toBe("test-user-id");
    });
  });

  describe('when the session user has role "admin"', () => {
    /** requireUser() is intentionally role-agnostic: admins are valid users and
     *  must pass through so admin accounts can also use student-facing features. */
    it("returns the user object (admins are valid users for requireUser)", async () => {
      const session = buildSession("admin");
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result).toEqual(session.user);
      expect(result.role).toBe("admin");
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("banned flag handling", () => {
    /** requireUser() authenticates only; it does not block banned accounts from
     *  receiving session.user — downstream pages/actions must enforce bans if needed. */
    it("returns user when banned is true for role user", async () => {
      const session = buildSession("user", { banned: true });
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result.banned).toBe(true);
      expect(result).toEqual(session.user);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    /** Same rule for admins: banned flag does not affect requireUser() output. */
    it("returns admin user when banned is true", async () => {
      const session = buildSession("admin", { banned: true });
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result.banned).toBe(true);
      expect(result.role).toBe("admin");
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
