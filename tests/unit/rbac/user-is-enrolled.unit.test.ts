/**
 * Unit tests — checkIfCourseBought (soft enrollment check for public UI)
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

  it("returns false and does not query Prisma when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await checkIfCourseBought("course-1");

    expect(result).toBe(false);
    expect(prisma.enrollment.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when there is no enrollment row", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

    const result = await checkIfCourseBought("course-1");

    expect(result).toBe(false);
  });

  it("returns false when enrollment status is Pending", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Pending",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(false);
  });

  it("returns false when enrollment status is Inactive", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Inactive",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(false);
  });

  it("returns true when enrollment status is Active", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
      status: "Active",
    } as never);

    expect(await checkIfCourseBought("course-1")).toBe(true);
  });
});
