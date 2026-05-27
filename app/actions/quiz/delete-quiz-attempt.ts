"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

export async function deleteQuizAttempt(attemptId: string) {
  try {
    const user = await requireUser();

    const whereClause = user.role === "admin" 
      ? { id: attemptId } 
      : { id: attemptId, userId: user.id };

    const attempt = await prisma.quizAttempt.findFirst({
      where: whereClause,
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
    revalidatePath("/admin/quizzes");

    return { status: "success" };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { status: "error", message: "Failed to delete attempt" };
  }
}
