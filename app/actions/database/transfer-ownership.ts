"use server";

// Alternative terminal transfer command:
// npx tsx scripts/transfer.ts

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";

export async function transferOwnershipAction(
  options: { courses: boolean; posts: boolean; comments: boolean }
) {
  const archiveAdminId = "archive-admin-account";     
  const archiveAdminName = "Archive Admin";           
  const archiveAdminEmail = "archive@yoursystem.com"; 
  let oldAdminId: string;
  let callerName = "Admin User";

  try {
    const sessionResponse = await authClient.getSession({
      fetchOptions: { headers: await headers() },
    });

    const session = sessionResponse?.data;

    if (!session || !session.user) {
      return { success: false, message: "Unauthorized: No active session found." };
    }

    const isAdmin = session.user.role === "admin";
    if (!isAdmin) {
      return { success: false, message: "Forbidden: Admin privileges are required." };
    }

    oldAdminId = session.user.id;

    if (oldAdminId === archiveAdminId) {
      return { success: false, message: "Aborted: The source admin matches the target archive profile." };
    }

    const sourceUser = await prisma.user.findUnique({ where: { id: oldAdminId } });
    if (sourceUser) {
      callerName = sourceUser.name || sourceUser.email || oldAdminId;
    }

    // Ensure the archive user exists
    await prisma.user.upsert({
      where: { id: archiveAdminId },
      update: {},
      create: {
        id: archiveAdminId,
        name: archiveAdminName,
        email: archiveAdminEmail,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "admin",
      },
    });

    let courseCount = 0;
    let postCount = 0;
    let commentCount = 0;

    if (options.courses) {
      const courseResult = await prisma.course.updateMany({
        where: { userId: oldAdminId },
        data: { userId: archiveAdminId },
      });
      courseCount = courseResult.count;
    }

    if (options.posts) {
      const postResult = await prisma.communityPost.updateMany({
        where: { userId: oldAdminId },
        data: { userId: archiveAdminId },
      });
      postCount = postResult.count;
    }

    if (options.comments) {
      const commentResult = await prisma.communityComment.updateMany({
        where: { userId: oldAdminId },
        data: { userId: archiveAdminId },
      });
      commentCount = commentResult.count;
    }

    const transferredItems = [];
    if (options.courses) transferredItems.push(`${courseCount} courses`);
    if (options.posts) transferredItems.push(`${postCount} community posts`);
    if (options.comments) transferredItems.push(`${commentCount} comments`);

    const itemsString = transferredItems.length > 0 ? transferredItems.join(", ") : "nothing";

    return {
      success: true,
      message: `🎉 Success! Transferred ${itemsString} from profile (${callerName}) to ${archiveAdminName}.`,
    };

  } catch (error) {
    console.error("Transfer failed:", error);
    return { success: false, message: "An unexpected error occurred during the transfer." };
  }
}
