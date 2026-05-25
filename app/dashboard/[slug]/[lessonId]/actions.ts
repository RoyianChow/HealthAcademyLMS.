// app\dashboard\[slug]\[lessonId]\actions.ts
"use server";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { EnrollmentStatus } from "@/src/generated/prisma/client";

export async function markLessonComplete(
  lessonId: string,
  slug: string
): Promise<ApiResponse> {
  const user = await requireUser();

  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        course: { slug },
        status: EnrollmentStatus.Active,
      },
    });

    if (!enrollment) {
      return {
        status: "error",
        message: "Progress tracking features require full course enrollment.",
      };
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        chapter: { course: { slug } },
      },
      include: {
        chapter: { select: { courseId: true } } // Need this for CourseProgress
      }
    });

    if (!lesson) {
      return {
        status: "error",
        message: "Lesson parameters match no record associated with this course.",
      };
    }

    // Update LessonProgress for the userId
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id,
        },
      },
      update: { completed: true },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        completed: true,
      },
    });

    // Check if the user has completed all lessons in the course
    const courseId = lesson.chapter.courseId;
    
    const totalLessons = await prisma.lesson.count({
      where: { 
        chapter: { courseId },
        isPublished: true 
      }
    });
    
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId: user.id,
        lesson: { 
          chapter: { courseId },
          isPublished: true
        },
        completed: true
      }
    });

    if (totalLessons > 0 && completedLessons >= totalLessons) {
      await prisma.courseProgress.upsert({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: courseId,
          }
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
        create: {
          userId: user.id,
          courseId: courseId,
          completed: true,
          completedAt: new Date(),
        }
      });
    }

    revalidatePath(`/dashboard/${slug}`);
    revalidatePath(`/dashboard/${slug}/${lessonId}`);

    return {
      status: "success",
      message: "Progress updated",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to mark lesson as complete",
    };
  }
}
