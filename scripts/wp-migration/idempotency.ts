import { createHash } from "crypto";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import {
  coerceRenderedHtml,
  decodeHtml,
} from "./content-parser";
import { collectQuizIdsFromSteps } from "./placement";
import type { MediaRef, MigrationState, WPCourse, WPQuiz } from "./state";

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_REGION, AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required"
    );
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error("S3_BUCKET_NAME environment variable is required");
  return bucket;
}

function getPublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (!url) throw new Error("NEXT_PUBLIC_S3_PUBLIC_URL environment variable is required");
  return url.replace(/\/$/, "");
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}

function contentTypeFromUrl(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function folderFromUrl(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "lesson-documents";
  if (lower.endsWith(".mp4")) return "lesson-videos";
  if (/\.(jpe?g|png|gif|webp|svg)$/.test(lower)) return "inline-images";
  return "wp-migration";
}

/** Stable S3 key derived from the WordPress source URL. */
export function deterministicFileKey(wpUrl: string): string {
  const hash = createHash("sha256").update(wpUrl).digest("hex").slice(0, 16);
  const filename = sanitizeFilename(wpUrl.split("/").pop()?.split("?")[0] ?? "file");
  const folder = folderFromUrl(wpUrl);
  return `wp-migration/${folder}/${hash}-${filename}`;
}

/** Stable S3 key for course thumbnail images. */
export function deterministicCourseThumbKey(wpUrl: string): string {
  const hash = createHash("sha256").update(wpUrl).digest("hex").slice(0, 16);
  const filename = sanitizeFilename(wpUrl.split("/").pop()?.split("?")[0] ?? "thumbnail");
  return `wp-migration/course-thumbnails/${hash}-${filename}`;
}

export function getCourseThumbnailUrl(wpCourse: WPCourse): string | null {
  const media = wpCourse._embedded?.["wp:featuredmedia"];
  if (!Array.isArray(media) || media.length === 0) return null;
  return media[0].source_url ?? null;
}

export async function getExistingMediaRef(
  wpUrl: string,
  fileKeyOverride?: string
): Promise<MediaRef | null> {
  const fileKey = fileKeyOverride ?? deterministicFileKey(wpUrl);
  const publicUrl = getPublicUrl();

  const fromDb = await prisma.lessonDocument.findFirst({
    where: { fileKey },
    select: { fileKey: true, fileUrl: true, fileSize: true, fileType: true },
  });
  if (fromDb) {
    return {
      fileKey: fromDb.fileKey,
      fileUrl: fromDb.fileUrl ?? `${publicUrl}/${fromDb.fileKey}`,
      fileSize: fromDb.fileSize ?? 0,
      contentType: fromDb.fileType ?? contentTypeFromUrl(wpUrl),
    };
  }

  const fromVideo = await prisma.lessonVideo.findFirst({
    where: { videoKey: fileKey },
    select: { videoKey: true },
  });
  if (fromVideo?.videoKey) {
    return {
      fileKey: fromVideo.videoKey,
      fileUrl: `${publicUrl}/${fromVideo.videoKey}`,
      fileSize: 0,
      contentType: contentTypeFromUrl(wpUrl),
    };
  }

  try {
    const s3 = getS3Client();
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: fileKey })
    );
    return {
      fileKey,
      fileUrl: `${publicUrl}/${fileKey}`,
      fileSize: head.ContentLength ?? 0,
      contentType: head.ContentType ?? contentTypeFromUrl(wpUrl),
    };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    const name = (err as { name?: string }).name;
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return null;
    }
    throw err;
  }
}

function quizTitle(wpQuiz: WPQuiz): string {
  return decodeHtml(coerceRenderedHtml(wpQuiz.title) || "Quiz");
}

export async function loadExistingMapsFromDb(
  state: MigrationState
): Promise<{
  courseMap: Record<number, string>;
  chapterMap: Record<number, string>;
  lessonMap: Record<number, string>;
  quizMap: Record<number, string>;
}> {
  const courseMap: Record<number, string> = { ...state.courseMap };
  const chapterMap: Record<number, string> = { ...state.chapterMap };
  const lessonMap: Record<number, string> = { ...state.lessonMap };
  const quizMap: Record<number, string> = { ...state.quizMap };

  for (const wpCourse of state.wpCourses) {
    const dbCourse = await prisma.course.findUnique({
      where: { slug: wpCourse.slug },
      select: { id: true },
    });
    if (!dbCourse) continue;

    courseMap[wpCourse.id] = dbCourse.id;

    const steps = state.wpStepTrees[wpCourse.id];
    const wpLessonsInTree = steps?.h?.["sfwd-lessons"];
    if (!wpLessonsInTree) continue;

    const lessonIds = Object.keys(wpLessonsInTree);
    for (let chapterIndex = 0; chapterIndex < lessonIds.length; chapterIndex++) {
      const wpLessonId = parseInt(lessonIds[chapterIndex], 10);
      const chapter = await prisma.chapter.findUnique({
        where: {
          courseId_position: { courseId: dbCourse.id, position: chapterIndex },
        },
        select: { id: true },
      });
      if (chapter) chapterMap[wpLessonId] = chapter.id;

      const lessonNode = wpLessonsInTree[lessonIds[chapterIndex]];
      const topicIds = Object.keys(lessonNode?.["sfwd-topic"] ?? {});
      if (!chapter) continue;

      for (let topicIndex = 0; topicIndex < topicIds.length; topicIndex++) {
        const wpTopicId = parseInt(topicIds[topicIndex], 10);
        const lesson = await prisma.lesson.findUnique({
          where: {
            chapterId_position: { chapterId: chapter.id, position: topicIndex },
          },
          select: { id: true },
        });
        if (lesson) lessonMap[wpTopicId] = lesson.id;
      }
    }
  }

  const tempState = { ...state, courseMap, chapterMap };
  const quizPlacement = collectQuizIdsFromSteps(tempState);

  for (const [wpQuizId, placement] of quizPlacement) {
    if (quizMap[wpQuizId]) continue;

    const wpQuiz = state.wpQuizzes.find((q) => q.id === wpQuizId);
    if (!wpQuiz) continue;

    const title = quizTitle(wpQuiz);
    const candidates = await prisma.quiz.findMany({
      where: {
        courseId: placement.courseId,
        chapterId: placement.chapterId ?? null,
        title,
      },
      select: {
        id: true,
        _count: { select: { questions: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (candidates.length === 0) continue;

    const best = [...candidates].sort(
      (a, b) => b._count.questions - a._count.questions || a.createdAt.getTime() - b.createdAt.getTime()
    )[0];
    quizMap[wpQuizId] = best.id;
  }

  return { courseMap, chapterMap, lessonMap, quizMap };
}

export async function loadExistingStripeMap(
  state: MigrationState
): Promise<Record<number, string>> {
  const stripeMap: Record<number, string> = { ...state.stripeMap };

  for (const wpCourse of state.wpCourses) {
    const existing = await prisma.course.findUnique({
      where: { slug: wpCourse.slug },
      select: { stripePriceId: true },
    });

    if (
      existing?.stripePriceId &&
      !existing.stripePriceId.startsWith("MIGRATION_PENDING")
    ) {
      stripeMap[wpCourse.id] = existing.stripePriceId;
    } else {
      stripeMap[wpCourse.id] = `MIGRATION_PENDING_${wpCourse.id}`;
    }
  }

  return stripeMap;
}

export async function loadExistingCourseThumbnails(
  state: MigrationState
): Promise<Record<number, string>> {
  const map: Record<number, string> = { ...state.courseThumbnailMap };

  for (const wpCourse of state.wpCourses) {
    if (map[wpCourse.id]) continue;

    const course = await prisma.course.findUnique({
      where: { slug: wpCourse.slug },
      select: { fileKey: true },
    });
    if (course?.fileKey && course.fileKey !== "MIGRATION_PENDING") {
      map[wpCourse.id] = course.fileKey;
    }
  }

  return map;
}
