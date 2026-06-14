import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

const maxAttemptsPerQuiz = 50;

export async function adminGetQuizAttempts(quizId: string) {
  await requireAdmin();

  return prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { createdAt: "desc" },
    take: maxAttemptsPerQuiz,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
