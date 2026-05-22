import "server-only";

import { prisma } from "@/lib/db";

export async function getProfilePageUser(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
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
        where: {
          status: "Active", 
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          course: {
            include: {
              chapters: {
                orderBy: {
                  position: "asc",
                },
                include: {
                  lessons: {
                    orderBy: {
                      position: "asc",
                    },
                    select: {
                      id: true,
                      lessonProgress: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      quizAttempts: {
        orderBy: {
          createdAt: "desc",
        },
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
}
