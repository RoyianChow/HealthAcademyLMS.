import "server-only";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";

export async function getQuizAttemptAccess(quizId: string) {
  const user = await requireUser();

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
    },
    select: {
      id: true,
      allowMultipleAttempts: true,
      attempts: {
        where: {
          userId: user.id,
          isComplete: true,
        },
        select: {
          id: true,
          attemptNumber: true,
        },
        orderBy: {
          attemptNumber: "desc",
        },
      },
    },
  });

  if (!quiz) {
    return {
      canAttempt: false,
      nextAttemptNumber: 1,
      previousAttemptsCount: 0,
    };
  }

  const previousAttemptsCount = quiz.attempts.length;
  const nextAttemptNumber =
    previousAttemptsCount > 0 ? quiz.attempts[0].attemptNumber + 1 : 1;

  const canAttempt =
    quiz.allowMultipleAttempts || previousAttemptsCount === 0;

  return {
    canAttempt,
    nextAttemptNumber,
    previousAttemptsCount,
  };
}