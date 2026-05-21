// app\dashboard\[slug]\[lessonId]\actions.ts
"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@/src/generated/prisma/client";

export async function markLessonComplete(
  lessonId: string,
  slug: string
): Promise<ApiResponse> {
  const user = await requireUser();

  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        course: { slug },
        status: EnrollmentStatus.Active,
      },
    });

    if (!enrollment) {
      return {
        status: "error",
        message: "Progress tracking features require full course enrollment.",
      };
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        chapter: {
          course: { slug },
        },
      },
      select: { id: true },
    });

    if (!lesson) {
      return {
        status: "error",
        message: "Lesson parameters match no record associated with this course.",
      };
    }

    await prisma.lesson.update({
      where: {
        id: lesson.id,
      },
      data: {
        lessonProgress: true,
      },
    });

    revalidatePath(`/dashboard/${slug}`);
    revalidatePath(`/dashboard/${slug}/${lessonId}`);

    return {
      status: "success",
      message: "Progress updated",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to mark lesson as complete",
    };
  }
}
