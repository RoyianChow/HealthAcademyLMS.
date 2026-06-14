import { requireUser } from "./require-user";
import { prisma } from "@/lib/db";
import { EnrollmentStatus } from "@/src/generated/prisma/client";
import { getCourseProgressSummaries } from "@/lib/course-progress";

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
        },
      },
    },
  });

  const courses = data.map((item) => item.course);
  const progressByCourse = await getCourseProgressSummaries(
    user.id,
    courses.map((course) => course.id)
  );

  return courses.map((course) => ({
    ...course,
    progress: progressByCourse.get(course.id) ?? {
      totalLessons: 0,
      completedLessons: 0,
      progressPercentage: 0,
    },
  }));
}

export type EnrolledCourseType = Awaited<
  ReturnType<typeof getEnrolledCourses>
>[number];
