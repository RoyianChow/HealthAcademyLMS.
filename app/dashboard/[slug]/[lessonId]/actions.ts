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
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        chapter: {
          course: {
            slug,
            enrollments: {
              some: {
                userId: user.id,
                status: EnrollmentStatus.Active,
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!lesson) {
      return {
        status: "error",
        message: "Lesson not found or you are not enrolled in this course.",
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