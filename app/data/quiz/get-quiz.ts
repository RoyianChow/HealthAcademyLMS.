import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma";

export async function getQuiz(quizId: string) {
  const user = await requireUser();

  return prisma.quiz.findFirst({
    where: {
      id: quizId,
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
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
      questions: {
        orderBy: {
          position: "asc",
        },
        include: {
          options: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              text: true,
            },
          },
        },
      },
    },
  });
}