import "server-only";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import {
  CourseStatus,
  EnrollmentStatus,
} from "@/src/generated/prisma/client";

export async function getDashboardCommunityCourses() {
  const user = await requireUser();

  return prisma.course.findMany({
    where: {
      status: CourseStatus.Published,
      enrollments: {
        some: {
          userId: user.id,
          status: EnrollmentStatus.Active,
        },
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      smallDescription: true,
      description: true,
      level: true,
      category: true,
      enrollments: {
        where: {
          status: EnrollmentStatus.Active,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}