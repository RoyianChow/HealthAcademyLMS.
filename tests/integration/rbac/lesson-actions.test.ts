/**
 * Integration tests — markLessonComplete RBAC
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    lesson: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markLessonComplete } from "@/app/dashboard/[slug]/[lessonId]/actions";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockRedirect = vi.mocked(redirect);

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

describe("markLessonComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated callers to /login", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      markLessonComplete("lesson-1", "course-slug")
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(prisma.lesson.findFirst).not.toHaveBeenCalled();
  });

  it("returns error when user is not enrolled in the course for this slug", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(null);

    const result = await markLessonComplete("lesson-1", "course-slug");

    expect(result.status).toBe("error");
    expect(result.message).toContain("not enrolled");
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });

  it("marks complete when lesson exists under slug with active enrollment", async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue({ id: "lesson-1" } as never);
    vi.mocked(prisma.lesson.update).mockResolvedValue({} as never);

    const result = await markLessonComplete("lesson-1", "course-slug");

    expect(result.status).toBe("success");
    expect(prisma.lesson.update).toHaveBeenCalledWith({
      where: { id: "lesson-1" },
      data: { lessonProgress: true },
    });
  });
});
