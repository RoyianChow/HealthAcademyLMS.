import { collectMediaUrlsFromCurriculum } from "../content-parser";
import {
  deterministicCourseThumbKey,
  getCourseThumbnailUrl,
  getExistingMediaRef,
  loadExistingCourseThumbnails,
  loadExistingMapsFromDb,
  loadExistingStripeMap,
} from "../idempotency";
import type { MigrationState } from "../state";

export async function loadExistingNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 2b: Loading existing Neon/S3 state ===");

  const maps = await loadExistingMapsFromDb(state);
  const stripeMap = await loadExistingStripeMap(state);
  const courseThumbnailMap = await loadExistingCourseThumbnails(state);

  const { pdfUrls, mp4Urls, imageUrls } = collectMediaUrlsFromCurriculum(
    state.wpLessons,
    state.wpTopics
  );
  const mediaUrls = [...new Set([...pdfUrls, ...mp4Urls, ...imageUrls])];

  const mediaMap = { ...state.mediaMap };
  let mediaFound = 0;

  for (const url of mediaUrls) {
    if (mediaMap[url]) {
      mediaFound++;
      continue;
    }

    const existing = await getExistingMediaRef(url);
    if (existing) {
      mediaMap[url] = existing;
      mediaFound++;
    }
  }

  // Pre-populate thumbnail URLs in mediaMap when S3 already has them
  for (const wpCourse of state.wpCourses) {
    if (courseThumbnailMap[wpCourse.id]) continue;

    const thumbnailUrl = getCourseThumbnailUrl(wpCourse);
    if (!thumbnailUrl || mediaMap[thumbnailUrl]) continue;

    const thumbKey = deterministicCourseThumbKey(thumbnailUrl);
    const existing = await getExistingMediaRef(thumbnailUrl, thumbKey);
    if (existing) {
      mediaMap[thumbnailUrl] = existing;
      courseThumbnailMap[wpCourse.id] = existing.fileKey;
      mediaFound++;
    }
  }

  console.log(
    `  Courses mapped: ${Object.keys(maps.courseMap).length}, ` +
      `chapters: ${Object.keys(maps.chapterMap).length}, ` +
      `lessons: ${Object.keys(maps.lessonMap).length}, ` +
      `quizzes: ${Object.keys(maps.quizMap).length}`
  );
  console.log(
    `  Thumbnails mapped: ${Object.keys(courseThumbnailMap).length}/${state.wpCourses.length}`
  );
  console.log(
    `  Media already present: ${mediaFound}/${mediaUrls.length} URLs`
  );

  return {
    courseMap: maps.courseMap,
    chapterMap: maps.chapterMap,
    lessonMap: maps.lessonMap,
    quizMap: maps.quizMap,
    stripeMap,
    courseThumbnailMap,
    mediaMap,
    migrationLog: [
      {
        phase: "loadExisting",
        message: `Mapped ${Object.keys(maps.courseMap).length} courses, ${Object.keys(courseThumbnailMap).length} thumbnails, ${mediaFound}/${mediaUrls.length} media URLs already in Neon/S3`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
