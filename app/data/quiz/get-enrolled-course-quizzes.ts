import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { EnrollmentStatus, CourseStatus } from "@/src/generated/prisma";

export async function getEnrolledCourseQuizzes() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return [];
  }

  return prisma.quiz.findMany({
    where: {
      isPublished: true,
      course: {
        is: {
          status: CourseStatus.Published,
          enrollments: {
            some: {
              userId: session.user.id,
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
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      questions: {
        select: {
          id: true,
          question: true,
          explanation: true,
          options: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              text: true,
              isCorrect: true,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
      attempts: {
        where: {
          userId: session.user.id,
          isComplete: true,
        },
        orderBy: {
          attemptNumber: "desc",
        },
        take: 1,
        select: {
          id: true,
          score: true,
          attemptNumber: true,
          submittedAt: true,
          isComplete: true,
          isGraded: true,
          feedback: true,
          answers: {
            select: {
              id: true,
              questionId: true,
              selectedOptionId: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  });
}