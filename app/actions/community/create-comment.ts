"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

export async function createComment({
  postId,
  content,
}: {
  postId: string;
  content: string;
}) {
  try {
    const user = await requireUser();

    if (!postId) {
      return { error: "Post ID is required" };
    }

    if (!content.trim()) {
      return { error: "Comment cannot be empty" };
    }

    await prisma.communityComment.create({
      data: {
        content,
        postId,
        userId: user.id,
      },
    });

    revalidatePath("/dashboard/community");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong while creating the comment." };
  }
}