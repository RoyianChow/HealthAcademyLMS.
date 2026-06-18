import "server-only";

import { prisma } from "@/lib/db";
import { getCourseProgressSummaries } from "@/lib/course-progress";

const maxQuizAttemptsOnProfile = 25;

export async function getProfilePageUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      courses: {
        include: {
          _count: {
            select: {
              chapters: true,
              quizzes: true,
              enrollments: true,
            },
          },
        },
      },
      enrollments: {
        where: { status: "Active" },
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
        },
      },
      quizAttempts: {
        orderBy: { createdAt: "desc" },
        take: maxQuizAttemptsOnProfile,
        include: {
          quiz: {
            include: {
              course: {
                select: {
                  title: true,
                  slug: true,
                },
              },
              chapter: {
                select: {
                  title: true,
                  position: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const progressByCourse = await getCourseProgressSummaries(
    userId,
    user.enrollments.map((enrollment) => enrollment.course.id)
  );

  return {
    ...user,
    enrollments: user.enrollments.map((enrollment) => ({
      ...enrollment,
      course: {
        ...enrollment.course,
        progress: progressByCourse.get(enrollment.course.id) ?? {
          totalLessons: 0,
          completedLessons: 0,
          progressPercentage: 0,
        },
      },
    })),
  };
}
