// Running this script transfers ownership of courses & community posts from an admin account to "archive-admin-account".
// If a User account that created courses is deleted, all of their associated courses will also be deleted. 
// To prevent this, we transfer the courses to a safe account before deleting the user.

// Use case 1: If an admin user is leaving the organization, you can transfer their courses to "archive-admin-account" to keep them accessible BEFORE admin account deletion.
// Use case 2: If you want to consolidate courses under a single account for easier management, you can transfer them to "archive-admin-account" while keeping the original admin's profile intact.
// Use case 3: If a hacker makes an admin account and creates courses, you can delete all Courses by simply deleting the User.

// Run: npx tsx scripts/transfer.ts

import * as dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/lib/db";

async function safelyTransferCourses() {
  const oldAdminId = "fAxIaHKC4VP7vDuO05e8kr8M0RHA0q1y"; // Replace with the actual admin user ID you want to transfer courses from
  const archiveAdminId = "archive-admin-account"; // This can be changed to a more secure string

  try {
    const archiveUser = await prisma.user.upsert({
      where: { id: archiveAdminId },
      update: {},
      create: {
        id: archiveAdminId,
        name: "Archive Admin",
        email: "archive@yoursystem.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "admin",
      },
    });

    console.log(`👤 Verified: Archive profile ready (${archiveUser.email})`);

    const result = await prisma.course.updateMany({
      where: { userId: oldAdminId },
      data: { userId: archiveAdminId },
    });

    console.log(`🎉 Success! Transferred ${result.count} courses.`);
  } catch (error) {
    console.error("Database migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

safelyTransferCourses();
