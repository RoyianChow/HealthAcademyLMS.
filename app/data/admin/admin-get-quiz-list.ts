import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetQuizList() {
  await requireAdmin();

  return prisma.quiz.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
  });
}

export type AdminQuizListItem = Awaited<ReturnType<typeof adminGetQuizList>>[0];
