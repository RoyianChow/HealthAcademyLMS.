"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@/src/generated/prisma/client";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";
import { isCommunityBanned } from "@/lib/community-ban";
import { getCommunityBanStatus } from "@/lib/community-ban-status";

export async function createPost({
  content,
  courseId,
  slug,
}: {
  content: string;
  courseId: string;
  slug: string;
}) {
  try {
    const user = await requireUser();

    const banStatus = await getCommunityBanStatus(user.id);
    if (banStatus && isCommunityBanned(banStatus)) {
      return { error: "You are currently banned from community interactions." };
    }

    if (!content.trim()) {
      return { error: "Post content is required" };
    }

    if (!courseId) {
      return { error: "Course ID is required" };
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId,
        status: EnrollmentStatus.Active,
      },
    });

    if (!enrollment) {
      return {
        error: "You must be enrolled in this course to create a post.",
      };
    }

    await prisma.communityPost.create({
      data: {
        content,
        userId: user.id,
        courseId,
      },
    });

    revalidatePath(`/dashboard/${slug}/community`);

    return { success: true };
  } catch (error) {
    rethrowIfNextRedirect(error);
    console.error(error);
    return { error: "Something went wrong while creating the post." };
  }
}
