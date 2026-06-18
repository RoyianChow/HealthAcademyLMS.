import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { EnrollmentStatus } from "@/src/generated/prisma/client";

export async function getCertificatePageData(slug: string) {
  const user = await requireUser();

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      user: {
        select: {
          name: true,
        },
      },
      enrollments: {
        where: {
          userId: user.id,
          status: EnrollmentStatus.Active,
        },
        select: {
          id: true,
          completedAt: true,
          purchasedAt: true,
          createdAt: true,
        },
        take: 1,
      },
      chapters: {
        select: {
          lessons: {
            where: { isPublished: true },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course || course.enrollments.length === 0) {
    return notFound();
  }

  const enrollment = course.enrollments[0];
  const lessonIds = course.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => lesson.id)
  );
  const totalLessons = lessonIds.length;

  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId: user.id,
      lessonId: { in: lessonIds },
      completed: true,
    },
  });

  const isComplete = totalLessons > 0 && completedLessons >= totalLessons;

  if (!isComplete) {
    return notFound();
  }

  const completionDate =
    enrollment.completedAt ??
    enrollment.purchasedAt ??
    enrollment.createdAt ??
    new Date();

  return {
    studentName: user.name,
    courseTitle: course.title,
    instructorName: course.user.name,
    completionDate,
    slug: course.slug,
  };
}

export type CertificatePageData = Awaited<ReturnType<typeof getCertificatePageData>>;
