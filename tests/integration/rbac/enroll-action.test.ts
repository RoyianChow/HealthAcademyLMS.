/**
 * Integration tests — enrollInCourseAction (public enrollment; getSession, not requireUser)
 *
 * Intentional divergence: unauthenticated callers receive { status: "unauthenticated" }
 * instead of redirect("/login").
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProtect = vi.fn().mockResolvedValue({ isDenied: () => false });

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    course: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  env: { BETTER_AUTH_URL: "http://localhost:3000" },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  },
}));

vi.mock("@/lib/arcjet", () => ({
  default: {
    withRule: vi.fn().mockReturnValue({
      protect: (...args: unknown[]) => mockProtect(...args),
    }),
  },
  fixedWindow: vi.fn(() => ({})),
}));

vi.mock("@arcjet/next", () => ({
  request: vi.fn().mockResolvedValue({}),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { enrollInCourseAction } from "@/app/(public)/courses/[slug]/actions";

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

describe("enrollInCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProtect.mockResolvedValue({ isDenied: () => false });
  });

  it("returns unauthenticated (no redirect) when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await enrollInCourseAction("course-1");

    expect(result).toEqual({
      status: "unauthenticated",
      message: "Please login to enroll",
    });
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when course is not found", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const result = await enrollInCourseAction("missing-id");

    expect(result).toEqual({
      status: "error",
      message: "Course not found",
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("returns error when course has no Stripe price", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "c1",
      title: "C",
      price: 10,
      slug: "s",
      stripePriceId: null,
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toMatchObject({
      status: "error",
      message: "This course does not have a Stripe price configured.",
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("returns success when user is already actively enrolled (no checkout)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "c1",
      title: "C",
      price: 10,
      slug: "s",
      stripePriceId: "price_123",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "e1",
            status: "Active",
          }),
        },
      };
      return fn(tx as never);
    });

    const result = await enrollInCourseAction("c1");

    expect(result).toEqual({
      status: "success",
      message: "You are already enrolled in this course",
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("returns error when Arcjet blocks the request", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockProtect.mockResolvedValue({ isDenied: () => true });

    const result = await enrollInCourseAction("c1");

    expect(result).toEqual({
      status: "error",
      message: "You have been blocked",
    });
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });
});
