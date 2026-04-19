import { prisma } from "@/lib/db";

export async function getQuiz(quizId: string) {
  return prisma.quiz.findUnique({
    where: {
      id: quizId,
      isPublished: true,
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
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
          },
        },
      },
    },
  });
}