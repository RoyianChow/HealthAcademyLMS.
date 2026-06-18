import { headers } from "next/headers";
import Stripe from "stripe";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });

  if (existingEvent) {
    return new Response("Event already processed", { status: 200 });
  }

  if (event.type !== "checkout.session.completed") {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
    return new Response("Event ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const courseId = session.metadata?.courseId;
  const enrollmentId = session.metadata?.enrollmentId;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  if (!courseId || !enrollmentId || !customerId) {
    console.error("STRIPE_WEBHOOK_MISSING_METADATA", {
      courseId,
      enrollmentId,
      customerId,
    });

    return new Response("Missing required checkout metadata", {
      status: 400,
    });
  }

  try {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { status: true },
    });

    if (existingEnrollment?.status === "Active") {
      await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
      return new Response("Enrollment already active", { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: {
        stripeCustomerId: customerId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      console.error("STRIPE_WEBHOOK_USER_NOT_FOUND", {
        customerId,
      });

      await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
      return new Response("User not found", { status: 200 });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;

    await prisma.$transaction([
      prisma.enrollment.update({
        where: {
          id: enrollmentId,
        },
        data: {
          userId: user.id,
          courseId,
          amount: session.amount_total ?? 0,
          status: "Active",
          purchasedAt: new Date(),
          stripeSessionId: session.id,
          stripePaymentId: paymentIntentId,
        },
      }),
      prisma.stripeWebhookEvent.create({ data: { id: event.id } }),
    ]);

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_PROCESSING_ERROR", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}
