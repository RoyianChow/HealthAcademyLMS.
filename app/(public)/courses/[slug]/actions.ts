"use server";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Stripe from "stripe";

type EnrollInCourseResponse =
  | {
      status: "success";
      message: string;
      checkoutUrl?: string;
    }
  | {
      status: "error";
      message: string;
      checkoutUrl?: undefined;
    }
  | {
      status: "unauthenticated";
      message: string;
      checkoutUrl?: undefined;
    };

export async function enrollInCourseAction(
  courseId: string
): Promise<EnrollInCourseResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      status: "unauthenticated",
      message: "Please login to enroll",
    };
  }

  const user = session.user;

  try {
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        title: true,
        price: true,
        slug: true,
        stripePriceId: true,
      },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
      };
    }

    // Courses migrated from WordPress were saved with a
    // "MIGRATION_PENDING_<id>" placeholder instead of a real Stripe price,
    // which makes checkout creation fail with "No such price". Create the
    // real Stripe product/price on first purchase attempt and persist it.
    let stripePriceId = course.stripePriceId;

    if (!stripePriceId || stripePriceId.startsWith("MIGRATION_PENDING")) {
      if (course.price <= 0) {
        return {
          status: "error",
          message: "This course is not available for purchase yet.",
        };
      }

      const stripeProduct = await stripe.products.create({
        name: course.title,
        default_price_data: {
          currency: "usd",
          unit_amount: Math.round(course.price * 100),
        },
      });

      stripePriceId = stripeProduct.default_price as string;

      await prisma.course.update({
        where: { id: course.id },
        data: { stripePriceId },
      });
    }

    let stripeCustomerId: string;

    const userWithStripeCustomerId = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        stripeCustomerId: true,
      },
    });

    if (userWithStripeCustomerId?.stripeCustomerId) {
      stripeCustomerId = userWithStripeCustomerId.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          stripeCustomerId,
        },
      });
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingEnrollment?.status === "Active") {
        return null;
      }

      if (existingEnrollment) {
        return tx.enrollment.update({
          where: {
            id: existingEnrollment.id,
          },
          data: {
            amount: course.price,
            status: "Pending",
            updatedAt: new Date(),
          },
        });
      }

      return tx.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amount: course.price,
          status: "Pending",
        },
      });
    });

    if (!enrollment) {
      return {
        status: "success",
        message: "You are already enrolled in this course",
      };
    }

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.BETTER_AUTH_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.BETTER_AUTH_URL}/payment/cancel`,
      metadata: {
        userId: user.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
      },
    };

    let checkoutSession: Stripe.Checkout.Session;

    try {
      // Collect sales tax (HST/GST for Canadian buyers) via Stripe Tax.
      // Requires Stripe Tax to be activated in the Stripe dashboard.
      checkoutSession = await stripe.checkout.sessions.create({
        ...checkoutParams,
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        customer_update: { address: "auto" },
      });
    } catch (error) {
      const isTaxConfigError =
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        (error.param?.includes("automatic_tax") ||
          error.message.toLowerCase().includes("tax"));

      if (!isTaxConfigError) {
        throw error;
      }

      // Stripe Tax is not activated on this account yet. Keep checkout
      // working without tax rather than blocking purchases entirely.
      console.error(
        "STRIPE_TAX_NOT_CONFIGURED: HST is NOT being collected. Activate Stripe Tax in the Stripe dashboard (Settings -> Tax) to charge HST at checkout.",
        error.message
      );

      checkoutSession = await stripe.checkout.sessions.create(checkoutParams);
    }

    if (!checkoutSession.url) {
      return {
        status: "error",
        message: "Could not create checkout session.",
      };
    }

    return {
      status: "success",
      message: "Redirecting to checkout...",
      checkoutUrl: checkoutSession.url,
    };
  } catch (error) {
    console.error("Enroll in course error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return {
        status: "error",
        message: "Payment system error. Please try again later.",
      };
    }

    return {
      status: "error",
      message: "Failed to enroll in course",
    };
  }
}