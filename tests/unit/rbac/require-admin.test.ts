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
 *
 * Banned-flag behaviour is asserted explicitly: requireAdmin() does not read
 * `banned`; only `role === "admin"` matters for the happy path.
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

function buildSession(role: SessionRole, opts?: { banned?: boolean }) {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireAdmin()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No session ─────────────────────────────────────────────────────────────

  describe("when there is no active session (unauthenticated)", () => {
    /** Verifies that a null session causes requireAdmin() to throw NEXT_REDIRECT,
     *  halting execution immediately so no protected code runs. */
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    });

    /** Confirms the redirect destination for unauthenticated callers is /login,
     *  not /not-admin — the user has no session and should be prompted to sign in. */
    it("redirects to /login", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    /** Guards against a regression where a null session incorrectly routes to
     *  /not-admin instead of /login; the two destinations have different UX intent. */
    it("does NOT redirect to /not-admin (wrong redirect destination)", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/not-admin");
    });
  });

  // ── Regular "user" role ────────────────────────────────────────────────────

  describe('when the session user has role "user"', () => {
    /** Verifies that a logged-in user without admin privileges is hard-stopped
     *  before any protected code executes. */
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    });

    /** Confirms the redirect destination for an authenticated non-admin is /not-admin,
     *  indicating the user is logged in but lacks the required role. */
    it("redirects to /not-admin", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
    });

    /** Guards against routing a logged-in user to the login page; /login is for
     *  unauthenticated callers only — authenticated non-admins belong at /not-admin. */
    it("does NOT redirect to /login (user has a valid session)", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/login");
    });

    /** Ensures only a single redirect() call is issued per invocation, preventing
     *  unexpected double-redirect side effects in middleware or action chains. */
    it("calls redirect exactly once", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      await expect(requireAdmin()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledOnce();
    });
  });

  // ── Absent / null / empty role ─────────────────────────────────────────────

  describe("when the session user has no role set", () => {
    /** Covers edge cases where a user account has no role attribute at all.
     *  All absent/empty variants should be treated identically to a non-admin user. */
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
    /** requireAdmin() uses strict equality ("admin") so near-matches like "Admin"
     *  or "ADMIN" must not pass — prevents case-folding privilege escalation. */
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
    /** Happy path: an admin caller receives the full session object so callers can
     *  use session data (e.g. userId) directly without a second getSession call. */
    it("returns the full session object without redirecting", async () => {
      const session = buildSession("admin");
      mockGetSession.mockResolvedValue(session);

      const result = await requireAdmin();

      expect(result).toEqual(session);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    /** Verifies the returned session payload contains the correct user id so
     *  downstream code that reads session.user.id gets the expected value. */
    it("exposes the correct user id on the returned session", async () => {
      mockGetSession.mockResolvedValue(buildSession("admin"));

      const result = await requireAdmin();

      expect(result.user.id).toBe("test-user-id");
    });
  });

  // ── Banned flag (not enforced here) ─────────────────────────────────────────

  describe("banned flag handling", () => {
    /** requireAdmin() gates only on role string equality; a banned account with
     *  role "user" is redirected exactly like any other non-admin user. */
    it('redirects to /not-admin when user is banned and role is "user"', async () => {
      mockGetSession.mockResolvedValue(buildSession("user", { banned: true }));

      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
    });

    /** Current implementation does not inspect `banned`; an admin account marked
     *  banned still passes requireAdmin().  Product layer must enforce bans elsewhere
     *  if needed — this test locks in today's behaviour. */
    it("returns session when user is banned but role is admin (no banned check)", async () => {
      const session = buildSession("admin", { banned: true });
      mockGetSession.mockResolvedValue(session);

      const result = await requireAdmin();

      expect(result).toEqual(session);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
