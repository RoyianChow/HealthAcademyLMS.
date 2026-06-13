"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

export type BanType = "community" | "site";

function parseBanExpiry(expiresAt: Date | string) {
  if (typeof expiresAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    const [year, month, day] = expiresAt.split("-").map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  return new Date(expiresAt);
}

export async function banUserAction(
  userIdToBan: string,
  reason: string,
  expiresAt: Date | string,
  banType: BanType = "community"
) {
  try {
    const admin = await requireUser();

    if (admin.role !== "admin") {
      return { error: "Unauthorized access. Only admins can ban users." };
    }

    if (!reason.trim()) {
      return { error: "A reason must be provided for this action." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userIdToBan },
      select: { role: true },
    });

    if (!targetUser) {
      return { error: "The targeted user could not be found." };
    }

    if (targetUser.role === "admin") {
      return { error: "Exemption rule active: Administrators cannot be banned." };
    }

    const expiry = parseBanExpiry(expiresAt);

    if (banType === "site") {
      await prisma.user.update({
        where: { id: userIdToBan },
        data: {
          banned: true,
          banReason: reason,
          banExpires: expiry,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userIdToBan },
        data: {
          communityBanned: true,
          communityBanReason: reason,
          communityBanExpires: expiry,
        },
      });
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while applying the user ban." };
  }
}

export async function unbanUserAction(
  userIdToUnban: string,
  banType: BanType = "community"
) {
  try {
    const admin = await requireUser();

    if (admin.role !== "admin") {
      return { error: "Unauthorized access. Only admins can un-ban users." };
    }

    if (banType === "site") {
      await prisma.user.update({
        where: { id: userIdToUnban },
        data: {
          banned: false,
          banReason: null,
          banExpires: null,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userIdToUnban },
        data: {
          communityBanned: false,
          communityBanReason: null,
          communityBanExpires: null,
        },
      });
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while removing the user ban." };
  }
}
