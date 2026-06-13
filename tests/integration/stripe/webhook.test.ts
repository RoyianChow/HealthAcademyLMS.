/**
 * Integration tests — POST /api/webhook/stripe
 *
 * Covers signature validation, ignored events, metadata checks,
 * user lookup failures, and the checkout.session.completed happy path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { headers } from "next/headers";

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { POST as webhookHandler } from "@/app/api/webhook/stripe/route";

const mockConstructEvent = vi.mocked(stripe.webhooks.constructEvent);
const mockHeaders = vi.mocked(headers);
const mockFindUser = vi.mocked(prisma.user.findUnique);
const mockFindEnrollment = vi.mocked(prisma.enrollment.findUnique);
const mockUpdateEnrollment = vi.mocked(prisma.enrollment.update);

const CHECKOUT_SESSION = {
  id: "cs_test_123",
  object: "checkout.session",
  amount_total: 9900,
  customer: "cus_test_student_001",
  metadata: {
    courseId: "00000000-0000-4000-8000-000000000001",
    enrollmentId: "00000000-0000-4000-8000-000000000004",
  },
} as unknown as Stripe.Checkout.Session;

function makeWebhookRequest(body = "{}") {
  return new Request("http://localhost:3000/api/webhook/stripe", {
    method: "POST",
    body,
  });
}

function makeCompletedEvent() {
  return {
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: CHECKOUT_SESSION,
    },
  } as Stripe.Event;
}

describe("POST /api/webhook/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(
      new Headers({ "stripe-signature": "test-signature" })
    );
    mockConstructEvent.mockReturnValue(makeCompletedEvent());
    mockFindUser.mockResolvedValue({ id: "student-test-001" } as never);
    mockFindEnrollment.mockResolvedValue({ status: "Pending" } as never);
    mockUpdateEnrollment.mockResolvedValue({} as never);
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    mockHeaders.mockResolvedValue(new Headers());

    const response = await webhookHandler(makeWebhookRequest());

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing Stripe signature");
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when webhook signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid webhook signature");
    expect(mockUpdateEnrollment).not.toHaveBeenCalled();
  });

  it("returns 200 and ignores unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_2",
      object: "event",
      type: "payment_intent.created",
      data: { object: {} },
    } as Stripe.Event);

    const response = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Event ignored");
    expect(mockUpdateEnrollment).not.toHaveBeenCalled();
  });

  it("returns 400 when checkout metadata is incomplete", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_3",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          ...CHECKOUT_SESSION,
          metadata: {},
          customer: null,
        },
      },
    } as Stripe.Event);

    const response = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing required checkout metadata");
    expect(mockUpdateEnrollment).not.toHaveBeenCalled();
  });

  it("returns 404 when stripe customer does not match a user", async () => {
    mockFindUser.mockResolvedValue(null);

    const response = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("User not found");
    expect(mockUpdateEnrollment).not.toHaveBeenCalled();
  });

  it("activates enrollment on checkout.session.completed", async () => {
    const response = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Webhook processed");
    expect(mockUpdateEnrollment).toHaveBeenCalledWith({
      where: { id: CHECKOUT_SESSION.metadata!.enrollmentId },
      data: expect.objectContaining({
        userId: "student-test-001",
        courseId: CHECKOUT_SESSION.metadata!.courseId,
        amount: CHECKOUT_SESSION.amount_total,
        status: "Active",
        purchasedAt: expect.any(Date),
        stripeSessionId: CHECKOUT_SESSION.id,
        stripePaymentId: null,
      }),
    });
  });

  it("skips duplicate webhook delivery when enrollment is already active", async () => {
    mockFindEnrollment
      .mockResolvedValueOnce({ status: "Pending" } as never)
      .mockResolvedValueOnce({ status: "Active" } as never);

    const request = makeWebhookRequest('{"id":"evt"}');

    const first = await webhookHandler(request);
    const second = await webhookHandler(makeWebhookRequest('{"id":"evt"}'));

    expect(first.status).toBe(200);
    expect(await first.text()).toBe("Webhook processed");
    expect(second.status).toBe(200);
    expect(await second.text()).toBe("Enrollment already active");
    expect(mockUpdateEnrollment).toHaveBeenCalledTimes(1);
  });
});
