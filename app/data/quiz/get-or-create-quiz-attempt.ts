import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma/client";

export async function getOrCreateQuizAttempt(quizId: string) {
  const user = await requireUser();

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      chapterId: { 
        not: null 
      },
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
      title: true,
      chapterId: true,
      allowMultipleAttempts: true,
      timeLimitMinutes: true,
      course: {
        select: { 
          id: true, 
          title: true, 
          slug: true 
        },
      },
      chapter: {
        select: { 
          id: true, 
          title: true, 
          position: true 
        },
      },
      attempts: {
        where: { 
          userId: user.id 
        },
        orderBy: { 
          attemptNumber: "desc" 
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
      blocked: false as const,
      attemptId: latestAttempt.id,
      attemptNumber: latestAttempt.attemptNumber,
      startedAt: latestAttempt.createdAt,
      timeLimitMinutes: quiz.timeLimitMinutes,
      quiz,
    };
  }

  const completedAttempts = quiz.attempts.filter((a) => a.isComplete);

  if (!quiz.allowMultipleAttempts && completedAttempts.length > 0) {
    return {
      blocked: true as const,
      attemptId: null,
      attemptNumber: completedAttempts[0].attemptNumber,
      startedAt: null,
      timeLimitMinutes: quiz.timeLimitMinutes,
      quiz,
    };
  }

  const nextAttemptNumber = latestAttempt?.attemptNumber
    ? latestAttempt.attemptNumber + 1
    : 1;

  return {
    blocked: false as const,
    attemptId: null, 
    attemptNumber: nextAttemptNumber,
    startedAt: null,
    timeLimitMinutes: quiz.timeLimitMinutes,
    quiz,
  };
}
