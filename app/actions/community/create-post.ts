"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

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

    if (!content.trim()) {
      return { error: "Post content is required" };
    }

    if (!courseId) {
      return { error: "Course ID is required" };
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
    console.error(error);
    return { error: "Something went wrong while creating the post." };
  }
}