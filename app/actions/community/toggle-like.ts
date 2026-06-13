"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@/src/generated/prisma/client";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";
import { getCommunityBanStatus, isCommunityBanned } from "@/lib/community-ban";

export async function toggleLike(postId: string) {
  try {
    const user = await requireUser();

    const banStatus = await getCommunityBanStatus(user.id);
    if (banStatus && isCommunityBanned(banStatus)) {
      return { error: "You are currently banned from community interactions." };
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: {
        courseId: true,
        course: {
          select: {
            slug: true,
          },
        },
      },
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
        error: "You must be enrolled in this course to like posts.",
      };
    }

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

    revalidatePath(`/dashboard/${post.course.slug}/community`);

    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while liking the post." };
  }
}
