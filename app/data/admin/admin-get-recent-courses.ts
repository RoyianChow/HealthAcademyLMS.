
import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetRecentCourses() {
  await requireAdmin();

  const data = await prisma.course.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 2,
    select: {
      id: true,
      title: true,
      smallDescription: true,
      description: true,
      category: true,
      duration: true,
      level: true,
      status: true,
      price: true,
      fileKey: true,
      slug: true,
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  return data;
}
