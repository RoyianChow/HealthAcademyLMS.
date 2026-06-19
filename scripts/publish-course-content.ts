/**
 * Publish all draft lessons and quizzes belonging to already-published courses.
 * Run: npx tsx --env-file=.env scripts/publish-course-content.ts
 */
import { CourseStatus } from "../src/generated/prisma/client";
import { prisma } from "../lib/db";

async function main() {
  const [lessons, quizzes] = await Promise.all([
    prisma.lesson.updateMany({
      where: {
        isPublished: false,
        chapter: {
          course: {
            status: CourseStatus.Published,
          },
        },
      },
      data: {
        isPublished: true,
      },
    }),
    prisma.quiz.updateMany({
      where: {
        isPublished: false,
        course: {
          status: CourseStatus.Published,
        },
      },
      data: {
        isPublished: true,
      },
    }),
  ]);

  console.log(`Published ${lessons.count} lesson(s) and ${quizzes.count} quiz(zes).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
