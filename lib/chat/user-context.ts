import "server-only";

import { prisma } from "@/lib/db";
import type { ChatUserContext } from "@/lib/chat/types";

export async function resolveChatUserContext(userId: string): Promise<ChatUserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      healthGoals: true,
      dietaryFocus: true,
      enrollments: {
        where: { status: "Active" },
        select: { courseId: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    goals: user.healthGoals,
    dietaryFocus: user.dietaryFocus,
    enrolledCourseIds: user.enrollments.map((enrollment) => enrollment.courseId),
  };
}
