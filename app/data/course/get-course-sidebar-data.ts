// app\data\course\get-course-sidebar-data.ts
import { prisma } from "@/lib/db";
import { requireUser } from "../user/require-user";
import { notFound } from "next/navigation";
import { EnrollmentStatus } from "@/src/generated/prisma/client";

export async function getCourseSidebarData(slug: string) {
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.id,
      course: { slug },
    },
    select: {
      status: true,
    },
  });

  const isEnrolled = enrollment?.status === EnrollmentStatus.Active;

  const lessonFilter = isEnrolled ? {} : { isFreePreview: true, isPublished: true };
  const chapterFilter = isEnrolled ? {} : { lessons: { some: { isFreePreview: true, isPublished: true } } };

  const course = await prisma.course.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      title: true,
      fileKey: true,
      duration: true,
      level: true,
      category: true,
      slug: true,
      chapters: {
        where: chapterFilter,
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          lessons: {
            where: lessonFilter,
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              position: true,
              description: true,
              isPublished: true,
              isFreePreview: true,
              lessonProgress: true,
            },
          },
          quizzes: isEnrolled
            ? {
                where: { isPublished: true },
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  isPublished: true,
                  chapterId: true,
                },
              }
            : false,
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const sanitizedChapters = course.chapters.map((chapter) => ({
    ...chapter,
    quizzes: chapter.quizzes || [],
  }));

  return {
    course: {
      ...course,
      chapters: sanitizedChapters,
    },
    isEnrolled,
  };
}

export type CourseSidebarDataType = Awaited<
  ReturnType<typeof getCourseSidebarData>
>;
