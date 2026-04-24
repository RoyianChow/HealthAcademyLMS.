import { requireUser } from "./require-user";
import { prisma } from "@/lib/db";
import { EnrollmentStatus } from "@/src/generated/prisma";

export async function getEnrolledCourses() {
  const user = await requireUser();

  const data = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      status: EnrollmentStatus.Active,
    },
    select: {
      course: {
        select: {
          id: true,
          smallDescription: true,
          title: true,
          fileKey: true,
          thumbnailKey: true,
          level: true,
          slug: true,
          duration: true,
          courseProgress: {
            where: {
              userId: user.id,
            },
            select: {
              id: true,
              completed: true,
              completedAt: true,
              courseId: true,
            },
          },
          chapters: {
            select: {
              id: true,
              lessons: {
                select: {
                  id: true,
                  title: true,
                  lessonProgress: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return data.map((item) => item.course);
}

export type EnrolledCourseType = Awaited<
  ReturnType<typeof getEnrolledCourses>
>[number];