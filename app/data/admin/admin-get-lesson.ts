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
      thumbnailKey: true,
      isPublished: true,
      isFreePreview: true,
      interactiveScript: true,
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
      videos: {
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          title: true,
          videoKey: true,
          youtubeUrl: true,
        },
      },
    },
  });

  if (!data) {
    return notFound();
  }

  // Map Prisma → Form shape
  return {
    ...data,
    name: data.title, 
  };
}

export type AdminLessonType = Awaited<
  ReturnType<typeof adminGetLesson>
>;
