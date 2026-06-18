import { prisma } from "@/lib/db";
import { htmlToTiptapJsonString } from "@/lib/tiptap-content";
import {
  decodeHtml,
  extractMp4Urls,
  extractPdfUrls,
  extractYouTubeIds,
  getPdfDisplayName,
  isInteractiveActivity,
  isReactCDNActivity,
  youtubeWatchUrl,
} from "../content-parser";
import type { MigrationState, WPLesson, WPTopic } from "../state";

function getOwnerUserId(): string {
  const userId = process.env.MIGRATION_OWNER_USER_ID;
  if (!userId) {
    throw new Error("MIGRATION_OWNER_USER_ID environment variable is required");
  }
  return userId;
}

function lessonById(lessons: WPLesson[], id: number): WPLesson | undefined {
  return lessons.find((l) => l.id === id);
}

function topicById(topics: WPTopic[], id: number): WPTopic | undefined {
  return topics.find((t) => t.id === id);
}

function parsePrice(wpPrice?: string): number {
  const parsed = parseInt(wpPrice ?? "0", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function writeCurriculumNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 5a: Writing curriculum to Prisma ===");

  const ownerUserId = getOwnerUserId();
  const courseMap: Record<number, string> = { ...state.courseMap };
  const chapterMap: Record<number, string> = { ...state.chapterMap };
  const lessonMap: Record<number, string> = { ...state.lessonMap };
  const errors: string[] = [];

  let coursesCreated = 0;
  let chaptersCreated = 0;
  let lessonsCreated = 0;
  let videosCreated = 0;
  let documentsCreated = 0;

  for (const wpCourse of state.wpCourses) {
    const steps = state.wpStepTrees[wpCourse.id];
    if (!steps?.h?.["sfwd-lessons"]) {
      console.log(`  Skipping course ${wpCourse.id} — no steps tree`);
      continue;
    }

    const lessonIds = Object.keys(steps.h["sfwd-lessons"]);
    if (lessonIds.length === 0) {
      console.log(`  Skipping course ${wpCourse.id} — empty curriculum`);
      continue;
    }

    try {
      const existing = await prisma.course.findUnique({
        where: { slug: wpCourse.slug },
      });

      if (existing) {
        console.log(
          `  Course slug "${wpCourse.slug}" already exists — mapping to existing ID ${existing.id}`
        );
        courseMap[wpCourse.id] = existing.id;
        continue;
      }

      const title = decodeHtml(wpCourse.title.rendered);
      const rawDescription =
        decodeHtml(wpCourse.content?.rendered ?? "") ||
        `Migrated from WordPress course ${wpCourse.id}`;

      const course = await prisma.course.create({
        data: {
          title: title.slice(0, 100),
          description: htmlToTiptapJsonString(rawDescription),
          smallDescription: title.slice(0, 200),
          slug: wpCourse.slug,
          status: "Draft",
          price: parsePrice(wpCourse.price_type_paynow_price),
          duration: 1,
          level: "Beginner",
          category: "Health & Fitness",
          fileKey: "MIGRATION_PENDING",
          stripePriceId: state.stripeMap[wpCourse.id] ?? `MIGRATION_PENDING_${wpCourse.id}`,
          userId: ownerUserId,
        },
      });

      courseMap[wpCourse.id] = course.id;
      coursesCreated++;
      console.log(`  Created course: ${title} (${course.id})`);

      const wpLessonsInTree = steps.h["sfwd-lessons"];

      for (let chapterIndex = 0; chapterIndex < lessonIds.length; chapterIndex++) {
        const wpLessonId = parseInt(lessonIds[chapterIndex], 10);
        const wpLesson = lessonById(state.wpLessons, wpLessonId);

        const chapterTitle = wpLesson
          ? decodeHtml(wpLesson.title.rendered)
          : `Module ${chapterIndex + 1}`;

        const chapter = await prisma.chapter.create({
          data: {
            title: chapterTitle,
            position: chapterIndex,
            courseId: course.id,
          },
        });

        chapterMap[wpLessonId] = chapter.id;
        chaptersCreated++;

        const lessonNode = wpLessonsInTree[lessonIds[chapterIndex]];
        const topicIds = Object.keys(lessonNode?.["sfwd-topic"] ?? {});

        for (let topicIndex = 0; topicIndex < topicIds.length; topicIndex++) {
          const wpTopicId = parseInt(topicIds[topicIndex], 10);
          const wpTopic = topicById(state.wpTopics, wpTopicId);

          if (!wpTopic) {
            errors.push(`Topic ${wpTopicId} not found in fetched pool`);
            continue;
          }

          const html = wpTopic.content.rendered;
          const isInteractive = isInteractiveActivity(wpTopic);
          const isReactCDN = isReactCDNActivity(wpTopic);

          const videoRecords: Array<{
            title: string | null;
            videoKey: string | null;
            youtubeUrl: string | null;
            position: number;
          }> = [];

          const youtubeIds = extractYouTubeIds(html);
          youtubeIds.forEach((id, idx) => {
            videoRecords.push({
              title: idx === 0 ? "Main Video" : `Video ${idx + 1}`,
              videoKey: null,
              youtubeUrl: youtubeWatchUrl(id),
              position: idx,
            });
          });

          const mp4Urls = extractMp4Urls(html);
          mp4Urls.forEach((url, idx) => {
            const media = state.mediaMap[url];
            videoRecords.push({
              title: `Video ${youtubeIds.length + idx + 1}`,
              videoKey: media?.fileKey ?? null,
              youtubeUrl: null,
              position: youtubeIds.length + idx,
            });
          });

          const pdfUrls = extractPdfUrls(html);
          const documentRecords = pdfUrls
            .map((url) => {
              const media = state.mediaMap[url];
              if (!media) return null;
              return {
                name: getPdfDisplayName(url),
                fileKey: media.fileKey,
                fileUrl: media.fileUrl,
                fileType: "application/pdf",
                fileSize: media.fileSize,
              };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null);

          const lesson = await prisma.lesson.create({
            data: {
              title: decodeHtml(wpTopic.title.rendered),
              content: isInteractive
                ? null
                : htmlToTiptapJsonString(html),
              interactiveScript:
                isInteractive && !isReactCDN ? html : null,
              position: topicIndex,
              chapterId: chapter.id,
              isPublished: false,
              isFreePreview: false,
              videos: {
                create: videoRecords.filter(
                  (v) => v.videoKey || v.youtubeUrl
                ),
              },
              documents: {
                create: documentRecords,
              },
            },
          });

          lessonMap[wpTopicId] = lesson.id;
          lessonsCreated++;
          videosCreated += videoRecords.filter(
            (v) => v.videoKey || v.youtubeUrl
          ).length;
          documentsCreated += documentRecords.length;

          if (isInteractive && isReactCDN) {
            errors.push(
              `React CDN activity skipped for interactiveScript: topic ${wpTopicId} "${decodeHtml(wpTopic.title.rendered)}"`
            );
          }
        }
      }
    } catch (err) {
      const msg = `Failed to migrate course ${wpCourse.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log(
    `Curriculum written: ${coursesCreated} courses, ${chaptersCreated} chapters, ${lessonsCreated} lessons`
  );

  return {
    courseMap,
    chapterMap,
    lessonMap,
    errors,
    migrationStats: {
      ...state.migrationStats,
      coursesCreated,
      chaptersCreated,
      lessonsCreated,
      videosCreated,
      documentsCreated,
    },
    migrationLog: [
      {
        phase: "writeCurriculum",
        message: `Created ${coursesCreated} courses, ${chaptersCreated} chapters, ${lessonsCreated} lessons`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
