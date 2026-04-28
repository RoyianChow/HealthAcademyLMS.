import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";
import { notFound } from "next/navigation";

export async function adminGetLesson(id: string) {
  await requireAdmin();

  const data = await prisma.lesson.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      videoKey: true,
      thumbnailKey: true,
      youtubeUrl: true,
      isPublished: true,
      isFreePreview: true,
      position: true,
      documents: {
        select: {
          id: true,
          name: true,
          fileKey: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
        },
      },
    },
  });

  if (!data) {
    return notFound();
  }

  // 🔥 Map Prisma → Form shape (important)
  return {
    ...data,
    name: data.title, // 👈 form expects `name`
  };
}

export type AdminLessonType = Awaited<
  ReturnType<typeof adminGetLesson>
>;