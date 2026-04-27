"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { revalidatePath } from "next/cache";

export async function deleteQuiz(quizId: string) {
  try {
    await requireAdmin();

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      select: {
        id: true,
      },
    });

    if (!quiz) {
      return {
        status: "error" as const,
        message: "Quiz not found.",
      };
    }

    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({
        where: {
          attempt: {
            quizId,
          },
        },
      }),

      prisma.quizAttempt.deleteMany({
        where: {
          quizId,
        },
      }),

      prisma.quizOption.deleteMany({
        where: {
          question: {
            quizId,
          },
        },
      }),

      prisma.quizQuestion.deleteMany({
        where: {
          quizId,
        },
      }),

      prisma.quiz.delete({
        where: {
          id: quizId,
        },
      }),
    ]);

    revalidatePath("/admin/quizzes");

    return {
      status: "success" as const,
      message: "Quiz deleted successfully.",
    };
  } catch (error) {
    console.error("deleteQuiz error:", error);

    return {
      status: "error" as const,
      message: "Failed to delete quiz.",
    };
  }
}