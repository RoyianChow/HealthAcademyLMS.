import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma";

export async function getOrCreateQuizAttempt(quizId: string) {
  const user = await requireUser();

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      course: {
        is: {
          status: CourseStatus.Published,
          enrollments: {
            some: {
              userId: user.id,
              status: EnrollmentStatus.Active,
            },
          },
        },
      },
    },
    select: {
      id: true,
      allowMultipleAttempts: true,
      timeLimitMinutes: true,
      attempts: {
        where: {
          userId: user.id,
        },
        orderBy: {
          attemptNumber: "desc",
        },
        select: {
          id: true,
          attemptNumber: true,
          isComplete: true,
          createdAt: true,
        },
      },
    },
  });

  if (!quiz) {
    return null;
  }

  const latestAttempt = quiz.attempts[0];

  if (latestAttempt && !latestAttempt.isComplete) {
    return {
      attemptId: latestAttempt.id,
      attemptNumber: latestAttempt.attemptNumber,
      startedAt: latestAttempt.createdAt,
      timeLimitMinutes: quiz.timeLimitMinutes,
    };
  }

  const completedAttempts = quiz.attempts.filter((attempt) => attempt.isComplete);

  if (!quiz.allowMultipleAttempts && completedAttempts.length > 0) {
    return {
      blocked: true as const,
      attemptId: null,
      attemptNumber: completedAttempts[0].attemptNumber,
      startedAt: null,
      timeLimitMinutes: quiz.timeLimitMinutes,
    };
  }

  const nextAttemptNumber =
    latestAttempt?.attemptNumber ? latestAttempt.attemptNumber + 1 : 1;

  const createdAttempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: user.id,
      attemptNumber: nextAttemptNumber,
      isComplete: false,
      isGraded: false,
    },
    select: {
      id: true,
      attemptNumber: true,
      createdAt: true,
    },
  });

  return {
    blocked: false as const,
    attemptId: createdAttempt.id,
    attemptNumber: createdAttempt.attemptNumber,
    startedAt: createdAttempt.createdAt,
    timeLimitMinutes: quiz.timeLimitMinutes,
  };
}