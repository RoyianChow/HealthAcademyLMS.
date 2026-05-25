"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

export async function banUserAction(userIdToBan: string, reason: string, expiresAt: Date | string) {
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

    await prisma.user.update({
      where: { id: userIdToBan },
      data: {
        banned: true,
        banReason: reason,
        banExpires: new Date(expiresAt),
      },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while applying the user ban." };
  }
}

export async function unbanUserAction(userIdToUnban: string) {
  try {
    const admin = await requireUser();

    if (admin.role !== "admin") {
      return { error: "Unauthorized access. Only admins can un-ban users." };
    }

    await prisma.user.update({
      where: { id: userIdToUnban },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
    });

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while removing the user ban." };
  }
}
