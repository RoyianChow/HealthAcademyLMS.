import "server-only";

import { prisma } from "@/lib/db";
import type { ChatUserContext } from "@/lib/chat/types";

export async function resolveChatUserContext(userId: string): Promise<ChatUserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    goals: [],
    dietaryFocus: [],
    enrolledCourseIds: [],
  };
}
