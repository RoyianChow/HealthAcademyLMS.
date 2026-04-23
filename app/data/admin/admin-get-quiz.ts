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
    passingScore: quiz.passingScore,
    timeLimitMinutes: quiz.timeLimitMinutes,
    allowMultipleAttempts: quiz.allowMultipleAttempts,
    courses,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      question: question.question,
      explanation: question.explanation,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}