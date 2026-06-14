import "server-only";

import { prisma } from "@/lib/db";

export async function getCommunityBanStatus(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      communityBanned: true,
      communityBanExpires: true,
      communityBanReason: true,
    },
  });
}
