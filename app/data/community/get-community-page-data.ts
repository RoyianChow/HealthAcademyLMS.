import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma/client";

const POSTS_LIMIT = 50;

/**
 * Loads course community data for `/dashboard/[slug]/community` with RBAC:
 * - Requires an authenticated user (`requireUser`).
 * - `notFound` when the course slug does not exist.
 * - Draft courses: only users with admin role (case-insensitive) may view.
 * - Published courses: active enrollment required unless the user is admin.
 */
export async function getCommunityPageData(slug: string) {
  const user = await requireUser();

  if (!slug?.trim()) {
    return notFound();
  }

  const course = await prisma.course.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      enrollments: {
        where: {
          userId: user.id,
          status: EnrollmentStatus.Active,
        },
        take: 1,
        select: {
          id: true,
        },
      },
      communityPosts: {
        take: POSTS_LIMIT,
        orderBy: [
          {
            isPinned: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          comments: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          likes: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: EnrollmentStatus.Active,
            },
          },
          communityPosts: true,
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const isAdmin = user.role?.toLowerCase() === "admin";
  const isEnrolled = course.enrollments.length > 0;

  if (course.status !== CourseStatus.Published && !isAdmin) {
    return notFound();
  }

  if (!isEnrolled && !isAdmin) {
    return notFound();
  }

  return { user, course };
}

export type CommunityPageData = Awaited<
  ReturnType<typeof getCommunityPageData>
>;
