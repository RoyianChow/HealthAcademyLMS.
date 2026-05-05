/**
 * Unit tests — checkIfCourseBought (soft enrollment check for public UI)
 *
 * checkIfCourseBought is a non-throwing check used on the public course landing
 * page to determine whether to show a "Buy" or "Continue Learning" CTA.
 * It returns a boolean and never redirects, making it safe to call before auth.
 *
 * The helper does not consult `banned`; only session presence and enrollment
 * status matter — asserted explicitly below.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    enrollment: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkIfCourseBought } from "@/app/data/user/user-is-enrolled";

const mockGetSession = vi.mocked(auth.api.getSession);

const SESSION = {
  user: {
    id: "user-1",
    name: "U",
    email: "u@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
  },
  session: {
    id: "s1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 3600000),
    token: "t",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("checkIfCourseBought", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Without a session there is no userId to scope the enrollment lookup,
   *  so Prisma is never called and false is returned immediately. */
  it("returns false and does not query Prisma when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await checkIfCourseBought("course-1");

    expect(result).toBe(false);
    expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
  });

  /** An authenticated user who has never purchased the course has no enrollment
   *  row; the function must return false rather than throwing. */
  it("returns false when there is no enrollment row", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

    const result = await checkIfCourseBought("course-1");

    expect(result).toBe(false);
  });

  /** Pending status indicates a purchase that has not yet completed (e.g. Stripe
   *  webhook not yet received); access should not be granted until confirmed. */
  it("returns false when enrollment status is Pending", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Pending",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(false);
  });

  /** Inactive status indicates an enrollment that has been cancelled or revoked;
   *  access must not be re-granted without a new active enrollment. */
  it("returns false when enrollment status is Inactive", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Inactive",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(false);
  });

  /** Happy path: an Active enrollment means the user has paid and their access
   *  has been confirmed; the public page should show the "Continue Learning" CTA. */
  it("returns true when enrollment status is Active", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Active",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(true);
  });

  /** checkIfCourseBought never reads `banned`; a banned user with an Active
   *  enrollment still counts as having bought the course for CTA purposes. */
  it("returns true for banned user when enrollment is Active", async () => {
    mockGetSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, banned: true },
    });
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Active",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(true);
  });
});
