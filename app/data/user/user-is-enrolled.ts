
import { prisma } from "@/lib/db";
import { getSessionUser } from "./require-user";

export async function checkIfCourseBought(courseId: string): Promise<boolean> {
  const user = await getSessionUser();

  if (!user) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        courseId: courseId,
        userId: user.id,
      },
    },
    select: {
      status: true,
    },
  });

  return enrollment?.status === "Active" ? true : false;
}
