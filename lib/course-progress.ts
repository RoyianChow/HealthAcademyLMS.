import "server-only";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/lib/db";

export type CourseProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
};

export async function getCourseProgressSummaries(
  userId: string,
  courseIds: string[]
): Promise<Map<string, CourseProgressSummary>> {
  if (courseIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.$queryRaw<
    Array<{
      courseId: string;
      totalLessons: number;
      completedLessons: number;
    }>
  >`
    SELECT ch."courseId" AS "courseId",
      COUNT(l.id)::int AS "totalLessons",
      COUNT(lp.id) FILTER (WHERE lp.completed = true)::int AS "completedLessons"
    FROM "Chapter" ch
    INNER JOIN "Lesson" l ON l."chapterId" = ch.id AND l."isPublished" = true
    LEFT JOIN "LessonProgress" lp ON lp."lessonId" = l.id AND lp."userId" = ${userId}
    WHERE ch."courseId" IN (${Prisma.join(courseIds)})
    GROUP BY ch."courseId"
  `;

  return new Map(
    rows.map((row) => [
      row.courseId,
      {
        totalLessons: row.totalLessons,
        completedLessons: row.completedLessons,
        progressPercentage:
          row.totalLessons > 0
            ? Math.round((row.completedLessons / row.totalLessons) * 100)
            : 0,
      },
    ])
  );
}
