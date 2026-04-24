"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/types";

import {
  lessonSchema,
  type LessonSchemaType,
  type LessonDocumentSchemaType,
} from "@/lib/zodSchemas";

export async function updateLesson(
  values: LessonSchemaType,
  lessonId: string
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
      await tx.lessonDocument.deleteMany({
        where: {
          lessonId,
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
            lessonId,
          })),
        });
      }

      await tx.lesson.update({
        where: {
          id: lessonId,
        },
        data: {
          title: data.title,
          description: data.description || null,
          content: data.content || null,
          thumbnailKey: data.thumbnailKey || null,
          videoKey: data.videoKey || null,
          youtubeUrl: data.youtubeUrl || null,
          isPublished: data.isPublished ?? false,
          isFreePreview: data.isFreePreview ?? false,
        },
      });
    });

    return {
      status: "success",
      message: "Lesson updated successfully",
    };
  } catch (error) {
    console.error("UPDATE_LESSON_ERROR", error);

    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to update lesson",
    };
  }
}