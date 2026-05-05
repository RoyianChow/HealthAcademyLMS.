/**
 * Unit tests — requireAdmin() RBAC gate
 *
 * requireAdmin() is the central role-enforcement function used by every admin
 * page and server action in the application.  These tests verify its behaviour
 * in isolation by mocking auth.api.getSession and capturing calls to redirect().
 *
 * User schema context:
 *   model User { role String? }  — role "user" means a regular user,
 *                                   role "admin" means an administrator.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

// Declare the mock before any imports so Vitest can hoist it
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/app/data/admin/require-admin";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SessionRole = string | null | undefined;

function buildSession(role: SessionRole) {
  return {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      role: role ?? null,
      banned: false,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireAdmin()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No session ─────────────────────────────────────────────────────────────

  describe("when there is no active session (unauthenticated)", () => {
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("redirects to /login", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("does NOT redirect to /not-admin (wrong redirect destination)", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/not-admin");
    });
  });

  // ── Regular "user" role ────────────────────────────────────────────────────

  describe('when the session user has role "user"', () => {
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("redirects to /not-admin", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
    });

    it("does NOT redirect to /login (user has a valid session)", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/login");
    });

    it("calls redirect exactly once", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledOnce();
    });
  });

  // ── Absent / null / empty role ─────────────────────────────────────────────

  describe("when the session user has no role set", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
    ])(
      'redirects to /not-admin when role is %s',
      async (_label, role) => {
        mockGetSession.mockResolvedValue(buildSession(role as SessionRole));

        await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
        expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
      }
    );
  });

  // ── Role comparison is strict / case-sensitive ─────────────────────────────

  describe("role comparison is strict and case-sensitive", () => {
    it.each([["Admin"], ["ADMIN"], ["aDmIn"], ["administrator"]])(
      'redirects to /not-admin for non-exact role "%s"',
      async (role) => {
        mockGetSession.mockResolvedValue(buildSession(role));

        await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
        expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
      }
    );
  });

  // ── Admin role ─────────────────────────────────────────────────────────────

  describe('when the session user has role "admin"', () => {
    it("returns the full session object without redirecting", async () => {
      const session = buildSession("admin");
      mockGetSession.mockResolvedValue(session);

      const result = await requireAdmin();

      expect(result).toEqual(session);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("exposes the correct user id on the returned session", async () => {
      mockGetSession.mockResolvedValue(buildSession("admin"));

      const result = await requireAdmin();

      expect(result.user.id).toBe("test-user-id");
    });
  });
});
