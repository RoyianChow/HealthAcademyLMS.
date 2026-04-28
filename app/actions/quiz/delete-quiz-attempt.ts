"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

export async function deleteQuizAttempt(attemptId: string) {
  try {
    const user = await requireUser();

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id,
      },
      select: {
        id: true,
        quizId: true,
      },
    });

    if (!attempt) {
      return { status: "error", message: "Attempt not found" };
    }

    // delete answers first (important)
    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({
        where: {
          attemptId: attempt.id,
        },
      }),
      prisma.quizAttempt.delete({
        where: {
          id: attempt.id,
        },
      }),
    ]);

    revalidatePath("/quizzes");

    return { status: "success" };
  } catch (error) {
    console.error(error);
    return { status: "error", message: "Failed to delete attempt" };
  }
}