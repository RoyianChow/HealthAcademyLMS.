"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function markLessonComplete(
  lessonId: string,
  slug: string
): Promise<ApiResponse> {
  await requireUser();

  try {
    await prisma.lesson.update({
      where: {
        id: lessonId,
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