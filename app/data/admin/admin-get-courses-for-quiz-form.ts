import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetCoursesForQuizForm() {
  await requireAdmin();

  return prisma.course.findMany({
    select: {
      id: true,
      title: true,
      chapters: {
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export type CourseForQuizForm = Awaited<
  ReturnType<typeof adminGetCoursesForQuizForm>
>[0];
