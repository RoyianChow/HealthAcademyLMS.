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

  if (event.type !== "checkout.session.completed") {
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

      return new Response("User not found", { status: 404 });
    }

    await prisma.enrollment.update({
      where: {
        id: enrollmentId,
      },
      data: {
        userId: user.id,
        courseId,
        amount: session.amount_total ?? 0,
        status: "Active",
      },
    });

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_PROCESSING_ERROR", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}