// app\data\course\get-lesson-content.ts
import { prisma } from "@/lib/db";
import { requireUser } from "../user/require-user";
import { notFound } from "next/navigation";
import { EnrollmentStatus } from "@/src/generated/prisma/client";

export async function getLessonContent(lessonId: string) {
  const session = await requireUser();

  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      thumbnailKey: true,
      videos: {
        select: {
          id: true,
          title: true,
          videoKey: true,
          youtubeUrl: true,
          position: true,
        },
        orderBy: {
          position: "asc",
        },
      },
      documents: true,
      position: true,
      isPublished: true,
      isFreePreview: true,
      lessonProgress: {
        where: {
          userId: session.id,
        },
      },
      chapter: {
        select: {
          courseId: true,
          course: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.id,
        courseId: lesson.chapter.courseId,
      },
    },
    select: {
      status: true,
    },
  });

  const hasActiveEnrollment = enrollment && enrollment.status === EnrollmentStatus.Active;

  if (!hasActiveEnrollment && !lesson.isFreePreview) {
    return notFound();
  }

  if (!lesson.isPublished && !lesson.isFreePreview) {
    return notFound();
  }

  return lesson;
}

export type LessonContentType = Awaited<ReturnType<typeof getLessonContent>>;
