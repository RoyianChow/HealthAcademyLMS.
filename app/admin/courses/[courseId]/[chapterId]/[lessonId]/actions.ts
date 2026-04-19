  "use server";

  import { requireAdmin } from "@/app/data/admin/require-admin";
  import { prisma } from "@/lib/db";
  import { ApiResponse } from "@/lib/types";
  import { lessonSchema, LessonSchemaType } from "@/lib/zodSchemas";

  export async function updateLesson(
    values: LessonSchemaType,
    lessonId: string
  ): Promise<ApiResponse> {
    await requireAdmin();

    try {
      const result = lessonSchema.safeParse(values);

      if (!result.success) {
        return {
          status: "error",
          message: "Invalid data",
        };
      }

      const data = result.data;

      // 🔥 Remove old documents
      await prisma.lessonDocument.deleteMany({
        where: {
          lessonId,
        },
      });

      // 🔥 Add new documents
      if (data.documents && data.documents.length > 0) {
        await prisma.lessonDocument.createMany({
          data: data.documents.map((doc) => ({
            name: doc.name,
            fileKey: doc.fileKey,
            fileUrl: doc.fileUrl ?? null,
            fileType: doc.fileType ?? null,
            fileSize: doc.fileSize ?? null,
            lessonId,
          })),
        });
      }

      // 🔥 Update lesson
      await prisma.lesson.update({
        where: {
          id: lessonId,
        },
        data: {
          title: data.name,
          description: data.description ?? null,
          thumbnailKey: data.thumbnailKey ?? null,
          videoKey: data.videoKey ?? null,
          youtubeUrl: data.youtubeUrl ?? null,
        },
      });

      return {
        status: "success",
        message: "Lesson updated successfully",
      };
    } catch (error) {
      console.error(error);

      return {
        status: "error",
        message: "Failed to update lesson",
      };
    }
  }