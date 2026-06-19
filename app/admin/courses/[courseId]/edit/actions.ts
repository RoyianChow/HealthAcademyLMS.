"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";
import {
  chapterSchema,
  ChapterSchemaType,
  courseSchema,
  CourseSchemaType,
  lessonSchema,
  type LessonSchemaType,
  type LessonDocumentSchemaType,
} from "@/lib/zodSchemas";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { CourseStatus } from "@/src/generated/prisma/client";

export type PublishScope = "course_only" | "course_and_all_content";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function editCourse(
  data: CourseSchemaType,
  courseId: string,
  options?: { publishScope?: PublishScope }
): Promise<ApiResponse> {
  const user = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: user.user.id,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "You have been blocked due to rate limiting",
        };
      } else {
        return {
          status: "error",
          message: "You are a bot! if this is a mistake contact our support",
        };
      }
    }

    const result = courseSchema.safeParse(data);

    if (!result.success) {
      return {
        status: "error",
        message: "Invalid data",
      };
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { status: true, slug: true },
    });

    if (!existingCourse) {
      return {
        status: "error",
        message: "Course not found",
      };
    }

    const isPublishing =
      result.data.status === CourseStatus.Published &&
      existingCourse.status !== CourseStatus.Published;

    if (
      isPublishing &&
      options?.publishScope === "course_and_all_content"
    ) {
      await prisma.$transaction([
        prisma.course.update({
          where: { id: courseId },
          data: { ...result.data },
        }),
        prisma.lesson.updateMany({
          where: { chapter: { courseId } },
          data: { isPublished: true },
        }),
        prisma.quiz.updateMany({
          where: { courseId },
          data: { isPublished: true },
        }),
      ]);
    } else {
      await prisma.course.update({
        where: { id: courseId },
        data: { ...result.data },
      });
    }

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${courseId}/edit`);
    revalidatePath("/courses");
    revalidatePath(`/courses/${existingCourse.slug}`);
    revalidatePath("/dashboard");

    if (isPublishing && options?.publishScope === "course_and_all_content") {
      return {
        status: "success",
        message: "Course and all lessons and quizzes published successfully",
      };
    }

    if (isPublishing) {
      return {
        status: "success",
        message:
          "Course published successfully. Draft lessons and quizzes remain unpublished.",
      };
    }

    return {
      status: "success",
      message: "Course updated successfully",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to update Course",
    };
  }
}

export async function reorderLessons(
  chapterId: string,
  lessons: { id: string; position: number }[],
  courseId: string
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    if (!lessons || lessons.length === 0) {
      return {
        status: "error",
        message: "No lessons provided for reordering.",
      };
    }

    const tempUpdates = lessons.map((lesson) =>
      prisma.lesson.update({
        where: {
          id: lesson.id, 
        },
        data: {
          position: -lesson.position,
        },
      })
    );

    const finalUpdates = lessons.map((lesson) =>
      prisma.lesson.update({
        where: {
          id: lesson.id,
        },
        data: {
          position: lesson.position,
        },
      })
    );
    await prisma.$transaction([...tempUpdates, ...finalUpdates]);

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Lessons reordered successfully",
    };
  } catch (error) {
    console.error("REORDER_LESSONS_ERROR:", error); 
    return {
      status: "error",
      message: "Failed to reorder lessons.",
    };
  }
}

export async function reorderChapters(
  courseId: string,
  chapters: { id: string; position: number }[]
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    if (!chapters || chapters.length === 0) {
      return {
        status: "error",
        message: "No chapters provided for reordering.",
      };
    }

    const tempUpdates = chapters.map((chapter) =>
      prisma.chapter.update({
        where: {
          id: chapter.id, 
        },
        data: {
          position: -chapter.position, 
        },
      })
    );

    const finalUpdates = chapters.map((chapter) =>
      prisma.chapter.update({
        where: {
          id: chapter.id,
        },
        data: {
          position: chapter.position,
        },
      })
    );
    await prisma.$transaction([...tempUpdates, ...finalUpdates]);

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Chapters reordered successfully",
    };
  } catch (error) {
    console.error("REORDER_CHAPTERS_ERROR:", error); 
    return {
      status: "error",
      message: "Failed to reorder chapters",
    };
  }
}

export async function createChapter(
  values: ChapterSchemaType
): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const result = chapterSchema.safeParse(values);

    if (!result.success) {
      return {
        status: "error",
        message: "Invalid Data",
      };
    }

    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.chapter.findFirst({
        where: {
          courseId: result.data.courseId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });

      await tx.chapter.create({
        data: {
          title: result.data.title,
          courseId: result.data.courseId,
          position: (maxPos?.position ?? 0) + 1,
        },
      });
    });

    revalidatePath(`/admin/courses/${result.data.courseId}/edit`);

    return {
      status: "success",
      message: "Chapter created successfully",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to create chapter",
    };
  }
}
export async function createLesson(
  values: LessonSchemaType
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    const result = lessonSchema.safeParse(values);

    if (!result.success) {
      console.log(result.error.flatten());

      return {
        status: "error",
        message: "Invalid lesson data",
      };
    }

    const data = result.data;

    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.lesson.findFirst({
        where: {
          chapterId: data.chapterId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });

      const validVideos = (data.videos ?? []).filter(v => v.videoKey || v.youtubeUrl);

      const createdLesson = await tx.lesson.create({
        data: {
          title: data.title,
          description: data.description || null,
          content: data.content || null,
          thumbnailKey: data.thumbnailKey || null,
          chapterId: data.chapterId,
          position: (maxPos?.position ?? 0) + 1,
          isPublished: data.isPublished ?? false,
          isFreePreview: data.isFreePreview ?? false,          
          videos: {
            create: validVideos.map((video, idx) => ({
              title: video.title || null,
              videoKey: video.videoKey || null,
              youtubeUrl: video.youtubeUrl || null,
              position: idx,
            })),
          },
        },
      });

      const documents: LessonDocumentSchemaType[] = data.documents ?? [];

      if (documents.length > 0) {
        await tx.lessonDocument.createMany({
          data: documents.map((doc) => ({
            name: doc.name,
            fileKey: doc.fileKey,
            fileUrl: doc.fileUrl ?? null,
            fileType: doc.fileType ?? null,
            fileSize: doc.fileSize ?? null,
            lessonId: createdLesson.id,
          })),
        });
      }
    });

    revalidatePath(`/admin/courses/${data.courseId}/edit`);

    return {
      status: "success",
      message: "Lesson created successfully",
    };
  } catch (error) {
    console.error("CREATE_LESSON_ERROR", error);

    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to create lesson",
    };
  }
}

export async function deleteLesson({
  chapterId,
  courseId,
  lessonId,
}: {
  chapterId: string;
  courseId: string;
  lessonId: string;
}): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const chapterWithLessons = await prisma.chapter.findUnique({
      where: {
        id: chapterId,
      },
      select: {
        lessons: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
        },
      },
    });

    if (!chapterWithLessons) {
      return {
        status: "error",
        message: "Chapter not Found",
      };
    }

    const lessons = chapterWithLessons.lessons;

    const lessonToDelete = lessons.find((lesson) => lesson.id === lessonId);

    if (!lessonToDelete) {
      return {
        status: "error",
        message: "Lesson not found in the chapter.",
      };
    }

    const remainingLessons = lessons.filter((lesson) => lesson.id !== lessonId);

    const updates = remainingLessons.map((lesson, index) => {
      return prisma.lesson.update({
        where: { id: lesson.id },
        data: { position: index + 1 },
      });
    });

    await prisma.$transaction([
      prisma.lesson.delete({
        where: {
          id: lessonId,
          chapterId: chapterId,
        },
      }),
      ...updates,
    ]);
    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Lesson deleted and positions reordered successfully",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to delete lesson",
    };
  }
}

export async function deleteChapter({
  chapterId,
  courseId,
}: {
  chapterId: string;
  courseId: string;
}): Promise<ApiResponse> {
  await requireAdmin();
  try {
    const courseWithChapters = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        chapters: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
        },
      },
    });

    if (!courseWithChapters) {
      return {
        status: "error",
        message: "Course not Found",
      };
    }

    const chapters = courseWithChapters.chapters;

    const chapterToDelete = chapters.find((chap) => chap.id === chapterId);

    if (!chapterToDelete) {
      return {
        status: "error",
        message: "Chapter not found in the Course.",
      };
    }

    const remainingChapters = chapters.filter((chap) => chap.id !== chapterId);

    const updates = remainingChapters.map((chap, index) => {
      return prisma.chapter.update({
        where: { id: chap.id },
        data: { position: index + 1 },
      });
    });

    await prisma.$transaction([
      prisma.chapter.delete({
        where: {
          id: chapterId,
        },
      }),
      ...updates,
    ]);
    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Chapter deleted and positions reordered successfully",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to delete chapter",
    };
  }
}

export async function editChapter({
  chapterId,
  courseId,
  title,
}: {
  chapterId: string;
  courseId: string;
  title: string;
}): Promise<ApiResponse> {
  await requireAdmin();
  try {
    if (!title || title.trim() === "") {
      return {
        status: "error",
        message: "Chapter title cannot be empty",
      };
    }

    await prisma.chapter.update({
      where: {
        id: chapterId,
      },
      data: {
        title: title,
      },
    });

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Chapter updated successfully",
    };
  } catch (error) {
    console.error("EDIT_CHAPTER_ERROR:", error);
    return {
      status: "error",
      message: "Failed to update chapter",
    };
  }
}


