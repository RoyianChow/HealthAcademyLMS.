"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@/src/generated/prisma/client";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

export async function createComment({
  postId,
  content,
}: {
  postId: string;
  content: string;
}) {
  try {
    const user = await requireUser();

    if (user.banned && user.banExpires && new Date(user.banExpires) > new Date()) {
      return { error: "You are currently banned from community interactions." };
    }

    if (!postId) {
      return { error: "Post ID is required" };
    }

    if (!content.trim()) {
      return { error: "Comment cannot be empty" };
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { courseId: true },
    });

    if (!post) {
      return { error: "Post not found." };
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: post.courseId,
        status: EnrollmentStatus.Active,
      },
    });

    if (!enrollment) {
      return {
        error: "You must be enrolled in this course to comment.",
      };
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
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while creating the comment." };
  }
}
