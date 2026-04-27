"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

export async function toggleLike(postId: string) {
  try {
    const user = await requireUser();

    const existingLike = await prisma.communityLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      await prisma.communityLike.delete({
        where: {
          id: existingLike.id,
        },
      });
    } else {
      await prisma.communityLike.create({
        data: {
          postId,
          userId: user.id,
        },
      });
    }

    revalidatePath("/dashboard/community");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong while liking the post." };
  }
}