import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma/client";
import { isCommunityBanned } from "@/lib/community-ban";
import { getCommunityBanStatus } from "@/lib/community-ban-status";

const POSTS_LIMIT = 50;

const COMMENTS_LIMIT = 20;

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
              role: true,
              banned: true,
              banReason: true,
              banExpires: true,
              communityBanned: true,
              communityBanReason: true,
              communityBanExpires: true,
            },
          },
          comments: {
            orderBy: {
              createdAt: "asc",
            },
            take: COMMENTS_LIMIT,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                  banned: true,
                  banReason: true,
                  banExpires: true,
                  communityBanned: true,
                  communityBanReason: true,
                  communityBanExpires: true,
                },
              },
            },
          },
          likes: {
            where: {
              userId: user.id,
            },
            select: {
              id: true,
              userId: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
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

  const banStatus = await getCommunityBanStatus(user.id);

  return {
    user,
    course,
    isCommunityBanned: banStatus ? isCommunityBanned(banStatus) : false,
    communityBanReason: banStatus?.communityBanReason ?? null,
    communityBanExpires: banStatus?.communityBanExpires ?? null,
  };
}

export type CommunityPageData = Awaited<
  ReturnType<typeof getCommunityPageData>
>;
