"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { ApiResponse } from "@/lib/types";
import { courseSchema, CourseSchemaType } from "@/lib/zodSchemas";

export async function CreateCourse(
  values: CourseSchemaType
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const validation = courseSchema.safeParse(values);

    if (!validation.success) {
      return {
        status: "error",
        message: "Invalid Form Data",
      };
    }

    // 1. Check for duplicate Name
    const existingTitle = await prisma.course.findFirst({
      where: {
        title: {
          equals: validation.data.title,
          mode: "insensitive",
        },
      },
    });

    if (existingTitle) {
      return {
        status: "error",
        message: "Course is the same name as a current course",
      };
    }

    // 2. Check for duplicate Slug
    const existingSlug = await prisma.course.findUnique({
      where: {
        slug: validation.data.slug,
      },
    });

    if (existingSlug) {
      return {
        status: "error",
        message: "This slug is already in use. Please generate a different one.",
      };
    }

    // 3. Create Stripe Product
    let stripeProduct;

    try {
      stripeProduct = await stripe.products.create({
        name: validation.data.title,
        description: validation.data.smallDescription,
        default_price_data: {
          currency: "usd",
          unit_amount: Math.round(validation.data.price * 100),
        },
      });
    } catch (error) {
      console.error("STRIPE_PRODUCT_CREATE_ERROR:", error);

      return {
        status: "error",
        message: "Failed to connect to payment provider (Stripe).",
      };
    }

    // 4. Create Database Entry
    await prisma.course.create({
      data: {
        ...validation.data,
        userId: session.user.id,
        stripePriceId: stripeProduct.default_price as string,
      },
    });

    return {
      status: "success",
      message: "Course created successfully",
    };
  } catch (error) {
    console.error("COURSE_CREATION_ERROR:", error);

    return {
      status: "error",
      message: "An unexpected error occurred while saving to the database.",
    };
  }
}