"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

export async function deletePost(postId: string) {
  try {
    const user = await requireUser();

    if (!postId) {
      return { error: "Post ID is required" };
    }

    const post = await prisma.communityPost.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!post) {
      return { error: "Post not found" };
    }

    if (post.userId !== user.id && user.role !== "admin") {
      return { error: "You are not allowed to delete this post" };
    }

    await prisma.communityPost.delete({
      where: {
        id: postId,
      },
    });

    revalidatePath("/dashboard/community");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong while deleting the post." };
  }
}