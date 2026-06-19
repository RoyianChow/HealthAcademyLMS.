import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { EnrollmentStatus, CourseStatus } from "@/src/generated/prisma/client";

export async function getEnrolledCourseQuizzes() {
  const user = await requireUser();

  return prisma.quiz.findMany({
    where: {
      isPublished: true,
      chapterId: {
        not: null,
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
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      isPublished: true,
      passingScore: true,
      timeLimitMinutes: true,
      chapterId: true,
      chapter: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
      attempts: {
        where: {
          userId: user.id,
          isComplete: true,
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          score: true,
          attemptNumber: true,
          submittedAt: true,
          isComplete: true,
          isGraded: true,
        },
      },
    },
  });
}

export async function getQuizResultDetails(quizId: string) {
  const user = await requireUser();

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      course: {
        enrollments: {
          some: {
            userId: user.id,
            status: EnrollmentStatus.Active,
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          question: true,
          explanation: true,
          questionType: true,
          options: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              text: true,
              isCorrect: true,
            },
          },
        },
      },
      attempts: {
        where: {
          userId: user.id,
          isComplete: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          score: true,
          attemptNumber: true,
          submittedAt: true,
          feedback: true,
          answers: {
            select: {
              id: true,
              questionId: true,
              selectedOptionId: true,
              textResponse: true,
              isCorrect: true,
              selections: {
                select: {
                  optionId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return quiz;
}
