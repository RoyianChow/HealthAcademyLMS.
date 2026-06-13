import { prisma } from "@/lib/db";

export type CommunityBanFields = {
  communityBanned?: boolean | null;
  communityBanExpires?: Date | string | null;
};

export function isCommunityBanned(user: CommunityBanFields): boolean {
  if (!user.communityBanned) {
    return false;
  }

  if (!user.communityBanExpires) {
    return true;
  }

  return new Date(user.communityBanExpires) > new Date();
}

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
