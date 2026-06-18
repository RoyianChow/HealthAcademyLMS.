"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function updateHealthProfileAction(formData: FormData) {
  try {
    const user = await requireUser();
    const healthGoals = parseTags(String(formData.get("healthGoals") ?? ""));
    const dietaryFocus = parseTags(String(formData.get("dietaryFocus") ?? ""));

    await prisma.user.update({
      where: { id: user.id },
      data: {
        healthGoals,
        dietaryFocus,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Failed to update your health profile." };
  }
}
