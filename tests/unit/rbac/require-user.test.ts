/**
 * Unit tests — requireUser() RBAC gate
 *
 * requireUser() is used by student-facing loaders and server actions.  It
 * redirects unauthenticated callers to /login and returns session.user for
 * any authenticated session (including admins).
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

function buildSession(role: string | null) {
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

describe("requireUser()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when there is no active session (unauthenticated)", () => {
    it("throws a NEXT_REDIRECT error to stop execution", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("redirects to /login", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("does NOT redirect to /not-admin", async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow();
      expect(mockRedirect).not.toHaveBeenCalledWith("/not-admin");
    });
  });

  describe('when the session user has role "user"', () => {
    it("returns the user object without redirecting", async () => {
      const session = buildSession("user");
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result).toEqual(session.user);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("exposes the correct user id", async () => {
      mockGetSession.mockResolvedValue(buildSession("user"));

      const result = await requireUser();

      expect(result.id).toBe("test-user-id");
    });
  });

  describe('when the session user has role "admin"', () => {
    it("returns the user object (admins are valid users for requireUser)", async () => {
      const session = buildSession("admin");
      mockGetSession.mockResolvedValue(session);

      const result = await requireUser();

      expect(result).toEqual(session.user);
      expect(result.role).toBe("admin");
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
