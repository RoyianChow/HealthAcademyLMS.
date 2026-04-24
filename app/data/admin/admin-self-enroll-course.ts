// app/data/admin/admin-self-enroll-course.ts
"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { EnrollmentStatus } from "@/src/generated/prisma";
import { revalidatePath } from "next/cache";

export async function adminSelfEnrollCourse(courseId: string) {
  const admin = await requireAdmin();

  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
    select: {
      id: true,
      price: true,
    },
  });

  if (!course) {
    return {
      status: "error",
      message: "Course not found",
    };
  }

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: admin.user.id,
        courseId: course.id,
      },
    },
    update: {
      status: EnrollmentStatus.Active,
      purchasedAt: new Date(),
    },
    create: {
      userId: admin.user.id,
      courseId: course.id,
      amount: course.price,
      status: EnrollmentStatus.Active,
      purchasedAt: new Date(),
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "You are now enrolled in this course.",
  };
}