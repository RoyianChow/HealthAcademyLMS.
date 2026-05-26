// migrate-videos.ts
// this script migrates existing video data from the old `videoKey` and `youtubeUrl` fields on the `Lesson` model
// to the new `LessonVideo` model, creating a single video entry for each lesson that has video data
// To run this script, use: `ts-node migrate-videos.ts` OR npx tsx --env-file=.env migrate-videos.ts
import { prisma } from "./lib/db";

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { videoKey: { not: null } },
        { youtubeUrl: { not: null } }
      ]
    }
  });

  console.log(`Migrating ${lessons.length} lessons...`);

  for (const lesson of lessons) {
    await prisma.lessonVideo.create({
      data: {
        lessonId: lesson.id,
        title: "Main Video",
        videoKey: lesson.videoKey,
        youtubeUrl: lesson.youtubeUrl,
        position: 0,
      }
    });
  }

  console.log("Migration complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
