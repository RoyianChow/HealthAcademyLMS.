// app/actions/community/delete-comment.ts

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";

export async function deleteCommunityComment(commentId: string) {
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

    const comment = await prisma.communityComment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        userId: true,
        postId: true,
      },
    });

    if (!comment) {
      return {
        status: "error" as const,
        message: "Comment not found.",
      };
    }

    const isOwner = comment.userId === user.id;
    const isAdmin = String(dbUser?.role ?? "").toLowerCase() === "admin";

    if (!isOwner && !isAdmin) {
      return {
        status: "error" as const,
        message: "You do not have permission to delete this comment.",
      };
    }

    await prisma.communityComment.delete({
      where: {
        id: commentId,
      },
    });

    revalidatePath("/community");

    return {
      status: "success" as const,
      message: "Comment deleted successfully.",
    };
  } catch {
    return {
      status: "error" as const,
      message: "Failed to delete comment.",
    };
  }
}