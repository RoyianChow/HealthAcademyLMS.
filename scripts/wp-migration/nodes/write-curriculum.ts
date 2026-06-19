import { prisma } from "@/lib/db";
import { htmlToTiptapJsonString } from "@/lib/tiptap-content";
import {
  decodeHtml,
  extractMp4Urls,
  extractPdfUrls,
  extractYouTubeIds,
  getPdfDisplayName,
  htmlWithoutEmbeddedMedia,
  isInteractiveActivity,
  rewriteImageUrlsInHtml,
  stripHtmlTags,
  youtubeWatchUrl,
} from "../content-parser";
import type { MigrationState, WPLesson, WPTopic } from "../state";

const WP_CDN_HOST = "healthacademy.ca";

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

type VideoRecord = {
  title: string | null;
  videoKey: string | null;
  youtubeUrl: string | null;
  position: number;
};

type DocumentRecord = {
  name: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

function buildMediaRecords(
  html: string,
  mediaMap: MigrationState["mediaMap"]
): { videoRecords: VideoRecord[]; documentRecords: DocumentRecord[] } {
  const videoRecords: VideoRecord[] = [];

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
    const media = mediaMap[url];
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
      const media = mediaMap[url];
      if (!media) return null;
      return {
        name: getPdfDisplayName(url),
        fileKey: media.fileKey,
        fileUrl: media.fileUrl,
        fileType: "application/pdf",
        fileSize: media.fileSize,
      };
    })
    .filter((d): d is DocumentRecord => d !== null);

  return { videoRecords, documentRecords };
}

async function addMissingLessonMedia(
  lessonId: string,
  videoRecords: VideoRecord[],
  documentRecords: DocumentRecord[]
): Promise<{ videosCreated: number; documentsCreated: number }> {
  const existingVideos = await prisma.lessonVideo.findMany({
    where: { lessonId },
    select: { youtubeUrl: true, videoKey: true, position: true },
  });
  const existingDocs = await prisma.lessonDocument.findMany({
    where: { lessonId },
    select: { fileKey: true },
  });

  const youtubeUrls = new Set(
    existingVideos.map((v) => v.youtubeUrl).filter(Boolean)
  );
  const videoKeys = new Set(
    existingVideos.map((v) => v.videoKey).filter(Boolean)
  );
  const docKeys = new Set(existingDocs.map((d) => d.fileKey));
  const usedPositions = new Set(existingVideos.map((v) => v.position));

  let videosCreated = 0;
  let documentsCreated = 0;

  for (const video of videoRecords) {
    if (!video.videoKey && !video.youtubeUrl) continue;
    if (video.youtubeUrl && youtubeUrls.has(video.youtubeUrl)) continue;
    if (video.videoKey && videoKeys.has(video.videoKey)) continue;

    let position = video.position;
    while (usedPositions.has(position)) position++;

    await prisma.lessonVideo.create({
      data: {
        title: video.title,
        videoKey: video.videoKey,
        youtubeUrl: video.youtubeUrl,
        position,
        lessonId,
      },
    });
    usedPositions.add(position);
    if (video.youtubeUrl) youtubeUrls.add(video.youtubeUrl);
    if (video.videoKey) videoKeys.add(video.videoKey);
    videosCreated++;
  }

  for (const doc of documentRecords) {
    if (docKeys.has(doc.fileKey)) continue;

    await prisma.lessonDocument.create({
      data: {
        name: doc.name,
        fileKey: doc.fileKey,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        lessonId,
      },
    });
    docKeys.add(doc.fileKey);
    documentsCreated++;
  }

  return { videosCreated, documentsCreated };
}

async function shiftLessonPositions(chapterId: string, delta: number): Promise<void> {
  const lessons = await prisma.lesson.findMany({
    where: { chapterId },
    orderBy: { position: "desc" },
    select: { id: true, position: true },
  });

  for (const lesson of lessons) {
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { position: lesson.position + delta },
    });
  }
}

async function ensureChapterIntroLesson(
  state: MigrationState,
  wpLesson: WPLesson,
  chapterId: string,
  chapterTitle: string,
  inlineImageUrlMap: Record<string, string>
): Promise<{
  created: boolean;
  videosCreated: number;
  documentsCreated: number;
}> {
  const rawHtml = wpLesson.content.rendered;
  const html =
    Object.keys(inlineImageUrlMap).length > 0
      ? rewriteImageUrlsInHtml(rawHtml, inlineImageUrlMap)
      : rawHtml;

  const { videoRecords, documentRecords } = buildMediaRecords(
    html,
    state.mediaMap
  );

  const hasVideos = videoRecords.some((v) => v.videoKey || v.youtubeUrl);
  const hasDocuments = documentRecords.length > 0;
  const textOnly = stripHtmlTags(htmlWithoutEmbeddedMedia(html));

  if (!hasVideos && !hasDocuments && !textOnly) {
    return { created: false, videosCreated: 0, documentsCreated: 0 };
  }

  const existingIntro = await prisma.lesson.findFirst({
    where: { chapterId, title: chapterTitle },
    select: { id: true },
  });

  if (existingIntro) {
    const media = await addMissingLessonMedia(
      existingIntro.id,
      videoRecords,
      documentRecords
    );
    return { created: false, ...media };
  }

  await shiftLessonPositions(chapterId, 1);

  const contentHtml = htmlWithoutEmbeddedMedia(html);
  const content =
    stripHtmlTags(contentHtml).length > 0
      ? htmlToTiptapJsonString(contentHtml)
      : null;

  await prisma.lesson.create({
    data: {
      title: chapterTitle,
      content,
      position: 0,
      chapterId,
      isPublished: true,
      isFreePreview: false,
      videos: {
        create: videoRecords.filter((v) => v.videoKey || v.youtubeUrl),
      },
      documents: {
        create: documentRecords,
      },
    },
  });

  return {
    created: true,
    videosCreated: videoRecords.filter((v) => v.videoKey || v.youtubeUrl).length,
    documentsCreated: documentRecords.length,
  };
}

async function ensureLesson(
  state: MigrationState,
  wpTopic: WPTopic,
  chapterId: string,
  topicIndex: number,
  inlineImageUrlMap: Record<string, string>,
  errors: string[]
): Promise<{
  lessonId: string;
  created: boolean;
  videosCreated: number;
  documentsCreated: number;
}> {
  const rawHtml = wpTopic.content.rendered;
  const html =
    Object.keys(inlineImageUrlMap).length > 0
      ? rewriteImageUrlsInHtml(rawHtml, inlineImageUrlMap)
      : rawHtml;
  const isInteractive = isInteractiveActivity(wpTopic);
  const { videoRecords, documentRecords } = buildMediaRecords(
    html,
    state.mediaMap
  );

  const existing = await prisma.lesson.findUnique({
    where: {
      chapterId_position: { chapterId, position: topicIndex },
    },
    select: {
      id: true,
      content: true,
      interactiveScript: true,
    },
  });

  if (existing) {
    const updates: {
      content?: string | null;
      interactiveScript?: string | null;
    } = {};

    if (!isInteractive && !existing.content) {
      updates.content = htmlToTiptapJsonString(html);
    }
    if (
      !isInteractive &&
      existing.content?.includes(WP_CDN_HOST) &&
      Object.keys(inlineImageUrlMap).length > 0
    ) {
      updates.content = htmlToTiptapJsonString(html);
    }
    if (isInteractive && !existing.interactiveScript) {
      updates.interactiveScript = html;
    }
    if (
      isInteractive &&
      existing.interactiveScript?.includes(WP_CDN_HOST) &&
      Object.keys(inlineImageUrlMap).length > 0
    ) {
      updates.interactiveScript = html;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.lesson.update({
        where: { id: existing.id },
        data: updates,
      });
    }

    const media = await addMissingLessonMedia(
      existing.id,
      videoRecords,
      documentRecords
    );
    return {
      lessonId: existing.id,
      created: false,
      ...media,
    };
  }

  const lesson = await prisma.lesson.create({
    data: {
      title: decodeHtml(wpTopic.title.rendered),
      content: isInteractive ? null : htmlToTiptapJsonString(html),
      interactiveScript: isInteractive ? html : null,
      position: topicIndex,
      chapterId,
      isPublished: true,
      isFreePreview: false,
      videos: {
        create: videoRecords.filter((v) => v.videoKey || v.youtubeUrl),
      },
      documents: {
        create: documentRecords,
      },
    },
  });

  return {
    lessonId: lesson.id,
    created: true,
    videosCreated: videoRecords.filter((v) => v.videoKey || v.youtubeUrl).length,
    documentsCreated: documentRecords.length,
  };
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

  const inlineImageUrlMap: Record<string, string> = {};
  for (const [wpUrl, ref] of Object.entries(state.mediaMap)) {
    if (ref.fileKey.startsWith("wp-migration/inline-images/")) {
      inlineImageUrlMap[wpUrl] = ref.fileUrl;
    }
  }

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
      let courseId = courseMap[wpCourse.id];

      if (!courseId) {
        const existing = await prisma.course.findUnique({
          where: { slug: wpCourse.slug },
          select: { id: true },
        });

        if (existing) {
          courseId = existing.id;
          courseMap[wpCourse.id] = courseId;
          console.log(
            `  Course slug "${wpCourse.slug}" exists — filling missing children (${courseId})`
          );
        } else {
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
              fileKey:
                state.courseThumbnailMap[wpCourse.id] ?? "MIGRATION_PENDING",
              stripePriceId:
                state.stripeMap[wpCourse.id] ??
                `MIGRATION_PENDING_${wpCourse.id}`,
              userId: ownerUserId,
            },
          });

          courseId = course.id;
          courseMap[wpCourse.id] = courseId;
          coursesCreated++;
          console.log(`  Created course: ${title} (${course.id})`);
        }
      }

      const thumbnailKey = state.courseThumbnailMap[wpCourse.id];
      if (thumbnailKey && courseId) {
        const currentCourse = await prisma.course.findUnique({
          where: { id: courseId },
          select: { fileKey: true },
        });
        if (currentCourse?.fileKey === "MIGRATION_PENDING") {
          await prisma.course.update({
            where: { id: courseId },
            data: { fileKey: thumbnailKey },
          });
          console.log(`  Updated thumbnail for course: ${wpCourse.slug}`);
        }
      }

      const wpLessonsInTree = steps.h["sfwd-lessons"];

      for (let chapterIndex = 0; chapterIndex < lessonIds.length; chapterIndex++) {
        const wpLessonId = parseInt(lessonIds[chapterIndex], 10);
        const wpLesson = lessonById(state.wpLessons, wpLessonId);
        const chapterTitle = wpLesson
          ? decodeHtml(wpLesson.title.rendered)
          : `Module ${chapterIndex + 1}`;

        let chapterId = chapterMap[wpLessonId];
        if (!chapterId) {
          const existingChapter = await prisma.chapter.findUnique({
            where: {
              courseId_position: { courseId, position: chapterIndex },
            },
            select: { id: true },
          });

          if (existingChapter) {
            chapterId = existingChapter.id;
          } else {
            const chapter = await prisma.chapter.create({
              data: {
                title: chapterTitle,
                position: chapterIndex,
                courseId,
              },
            });
            chapterId = chapter.id;
            chaptersCreated++;
          }
          chapterMap[wpLessonId] = chapterId;
        }

        const lessonNode = wpLessonsInTree[lessonIds[chapterIndex]];
        const topicIds = Object.keys(lessonNode?.["sfwd-topic"] ?? {});

        for (let topicIndex = 0; topicIndex < topicIds.length; topicIndex++) {
          const wpTopicId = parseInt(topicIds[topicIndex], 10);
          const wpTopic = topicById(state.wpTopics, wpTopicId);

          if (!wpTopic) {
            errors.push(`Topic ${wpTopicId} not found in fetched pool`);
            continue;
          }

          const result = await ensureLesson(
            state,
            wpTopic,
            chapterId,
            topicIndex,
            inlineImageUrlMap,
            errors
          );

          lessonMap[wpTopicId] = result.lessonId;
          if (result.created) lessonsCreated++;
          videosCreated += result.videosCreated;
          documentsCreated += result.documentsCreated;
        }

        if (wpLesson) {
          const intro = await ensureChapterIntroLesson(
            state,
            wpLesson,
            chapterId,
            chapterTitle,
            inlineImageUrlMap
          );
          if (intro.created) lessonsCreated++;
          videosCreated += intro.videosCreated;
          documentsCreated += intro.documentsCreated;
        }
      }
    } catch (err) {
      const msg = `Failed to migrate course ${wpCourse.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log(
    `Curriculum written: ${coursesCreated} new courses, ${chaptersCreated} new chapters, ` +
      `${lessonsCreated} new lessons, ${videosCreated} new videos, ${documentsCreated} new documents`
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
        message: `Created ${coursesCreated} courses, ${chaptersCreated} chapters, ${lessonsCreated} lessons (fill-missing mode)`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
