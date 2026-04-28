// app/actions/community/delete-post.ts

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";

export async function deleteCommunityPost(postId: string) {
  try {
    const user = await requireUser();

    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        role: true,
      },
    });

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
      return {
        status: "error" as const,
        message: "Post not found.",
      };
    }

    const isOwner = post.userId === user.id;
    const isAdmin = String(dbUser?.role ?? "").toLowerCase() === "admin";

    if (!isOwner && !isAdmin) {
      return {
        status: "error" as const,
        message: "You do not have permission to delete this post.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.communityLike.deleteMany({
        where: {
          postId,
        },
      });

      await tx.communityComment.deleteMany({
        where: {
          postId,
        },
      });

      await tx.communityPost.delete({
        where: {
          id: postId,
        },
      });
    });

    revalidatePath("/community");

    return {
      status: "success" as const,
      message: "Post deleted successfully.",
    };
  } catch {
    return {
      status: "error" as const,
      message: "Failed to delete post.",
    };
  }
}