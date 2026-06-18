/**
 * Integration tests — enrollInCourseAction (public enrollment; getSession, not requireUser)
 *
 * Intentional divergence: unauthenticated callers receive { status: "unauthenticated" }
 * instead of redirect("/login").  The action uses getSession directly rather than
 * requireUser() so the public course page can render a contextual CTA without
 * Next.js throwing a redirect.
 *
 * All paid flows require `stripePriceId`; there is no server-side “free enroll”
 * branch — a $0 course still goes through Checkout when a price id exists.
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

const COURSE_WITH_PRICE = {
  id: "c1",
  title: "C",
  price: 99,
  slug: "s",
  stripePriceId: "price_123",
};

describe("enrollInCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProtect.mockResolvedValue({ isDenied: () => false });
  });

  /** enrollInCourseAction uses getSession (not requireUser) so unauthenticated
   *  callers receive a structured { status: "unauthenticated" } response instead
   *  of a redirect, allowing the public page to handle auth UX gracefully. */
  it("returns unauthenticated (no redirect) when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await enrollInCourseAction("course-1");

    expect(result).toEqual({
      status: "unauthenticated",
      message: "Please login to enroll",
    });
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  /** The course lookup runs after auth; if the course does not exist, a
   *  structured error is returned and Stripe checkout is never initiated. */
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

  /** A course without a Stripe price ID cannot be purchased; this guard prevents
   *  creating a Stripe checkout session that would immediately fail. */
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

  /** Idempotency check: a user who is already actively enrolled must not be
   *  redirected to Stripe for a duplicate purchase. */
  it("returns success when user is already actively enrolled (no checkout)", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
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

  /** Arcjet rate-limiting is evaluated before any DB call; even an authenticated
   *  user is blocked when the protection rule signals isDenied. */
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

  /** Brand-new enrollment (no row): transaction creates Pending enrollment then
   *  Stripe Checkout returns a URL the client can redirect to. */
  it("returns success with checkoutUrl when checkout session is created", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "e-new", status: "Pending" }),
          update: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
      id: "cs_test",
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toEqual({
      status: "success",
      message: "Redirecting to checkout...",
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        mode: "payment",
        metadata: expect.objectContaining({
          userId: "user-1",
          courseId: "c1",
          enrollmentId: "e-new",
        }),
      })
    );
  });

  /** Price may be 0 while stripePriceId still points at a free SKU in Stripe;
   *  the server always opens Checkout when a price id exists — no separate bypass. */
  it("returns checkoutUrl for zero-price course when stripePriceId is configured", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "c1",
      title: "Freebie",
      price: 0,
      slug: "free",
      stripePriceId: "price_free",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "e-free", status: "Pending" }),
          update: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/free",
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toMatchObject({
      status: "success",
      checkoutUrl: "https://checkout.stripe.com/free",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalled();
  });

  /** Inactive enrollment is upgraded to Pending and the user is sent to Checkout
   *  to complete payment again — metadata still ties checkout to enrollment id. */
  it("returns checkoutUrl when re-enrolling from Inactive enrollment", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "e-inactive",
            status: "Inactive",
          }),
          update: vi.fn().mockResolvedValue({
            id: "e-inactive",
            status: "Pending",
          }),
          create: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/retry",
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toMatchObject({
      status: "success",
      checkoutUrl: "https://checkout.stripe.com/retry",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ enrollmentId: "e-inactive" }),
      })
    );
  });

  /** Pending enrollment (unfinished checkout) follows the update branch and
   *  opens a fresh Checkout session so the user can resume payment. */
  it("returns checkoutUrl when existing enrollment is still Pending", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "e-pending",
            status: "Pending",
          }),
          update: vi.fn().mockResolvedValue({
            id: "e-pending",
            status: "Pending",
          }),
          create: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/resume",
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toMatchObject({
      status: "success",
      checkoutUrl: "https://checkout.stripe.com/resume",
    });
  });

  /** Defensive handling when Stripe omits url on the session object — avoids
   *  returning a broken “success” payload to the client. */
  it("returns error when Stripe checkout session has no URL", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_1",
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "e-x", status: "Pending" }),
          update: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: null,
    } as never);

    const result = await enrollInCourseAction("c1");

    expect(result).toEqual({
      status: "error",
      message: "Could not create checkout session.",
    });
  });

  /** First-time payers have no stripeCustomerId; the action creates a Stripe
   *  Customer, persists it on User, then builds the Checkout session. */
  it("creates Stripe customer and persists stripeCustomerId before checkout", async () => {
    mockGetSession.mockResolvedValue(SESSION);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE_WITH_PRICE,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      stripeCustomerId: null,
    } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({
      id: "cus_created",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        enrollment: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "e-new", status: "Pending" }),
          update: vi.fn(),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: "https://checkout.stripe.com/new-cust",
    } as never);

    await enrollInCourseAction("c1");

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "u@example.com",
        metadata: { userId: "user-1" },
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { stripeCustomerId: "cus_created" },
      })
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_created" })
    );
  });
});
