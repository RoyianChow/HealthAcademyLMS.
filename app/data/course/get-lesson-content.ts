
import { prisma } from "@/lib/db";
import { requireUser } from "../user/require-user";
import { notFound } from "next/navigation";
import { EnrollmentStatus } from "@/src/generated/prisma";

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
      videoKey: true,
      youtubeUrl: true,
      documents: true,
      position: true,
      isPublished: true,
      isFreePreview: true,
      lessonProgress: true,
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

  if (!enrollment || enrollment.status !== EnrollmentStatus.Active) {
    return notFound();
  }

  return lesson;
}

export type LessonContentType = Awaited<ReturnType<typeof getLessonContent>>;