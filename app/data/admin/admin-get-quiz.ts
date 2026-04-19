import { prisma } from "@/lib/db";

export async function adminGetQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    include: {
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

  if (!quiz) {
    return null;
  }

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    courseId: quiz.courseId,
    isPublished: quiz.isPublished,
    courses,
    questions: quiz.questions.map((question: { id: any; question: any; options: any[]; }) => ({
      id: question.id,
      question: question.question,
      options: question.options.map((option: { id: any; text: any; isCorrect: any; }) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}