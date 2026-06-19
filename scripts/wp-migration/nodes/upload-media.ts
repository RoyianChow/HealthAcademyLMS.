import { collectMediaUrlsFromCurriculum } from "../content-parser";
import {
  deterministicCourseThumbKey,
  getCourseThumbnailUrl,
  getExistingMediaRef,
} from "../idempotency";
import { downloadAndUpload } from "../s3-uploader";
import type { MediaRef, MigrationState } from "../state";

export async function uploadMediaNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 3: Uploading media to S3 ===");

  const { pdfUrls, mp4Urls, imageUrls } = collectMediaUrlsFromCurriculum(
    state.wpLessons,
    state.wpTopics
  );
  const mediaQueue = [
    ...new Set([...pdfUrls, ...mp4Urls, ...imageUrls]),
  ];

  console.log(
    `Media queue: ${mediaQueue.length} unique files ` +
      `(${pdfUrls.length} PDFs, ${mp4Urls.length} MP4s, ${imageUrls.length} inline images)`
  );

  const mediaMap: Record<string, MediaRef> = { ...state.mediaMap };
  const courseThumbnailMap: Record<number, string> = {
    ...state.courseThumbnailMap,
  };
  const errors: string[] = [];
  let pdfsUploaded = 0;
  let mp4sUploaded = 0;
  let imagesUploaded = 0;
  let totalBytesUploaded = 0;
  let skippedExisting = 0;

  // Phase 3a: PDFs and MP4s
  const pdfMp4Queue = [...new Set([...pdfUrls, ...mp4Urls])];
  console.log(`\n--- Phase 3a: PDFs and MP4s (${pdfMp4Queue.length}) ---`);

  for (let i = 0; i < pdfMp4Queue.length; i++) {
    const url = pdfMp4Queue[i];

    if (mediaMap[url]) {
      skippedExisting++;
      continue;
    }

    const existing = await getExistingMediaRef(url);
    if (existing) {
      mediaMap[url] = existing;
      skippedExisting++;
      console.log(`  [${i + 1}/${pdfMp4Queue.length}] Already in Neon/S3: ${url}`);
      continue;
    }

    console.log(`  [${i + 1}/${pdfMp4Queue.length}] Uploading ${url}`);

    try {
      const ref = await downloadAndUpload(url);
      mediaMap[url] = ref;
      totalBytesUploaded += ref.fileSize;

      if (url.toLowerCase().split("?")[0].endsWith(".pdf")) pdfsUploaded++;
      if (url.toLowerCase().split("?")[0].endsWith(".mp4")) mp4sUploaded++;
    } catch (err) {
      const msg = `Failed to upload ${url}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  // Phase 3b: Course thumbnails
  console.log(`\n--- Phase 3b: Course thumbnails (${state.wpCourses.length} courses) ---`);
  let thumbnailsUploaded = 0;
  let thumbnailsSkipped = 0;

  for (const wpCourse of state.wpCourses) {
    if (courseThumbnailMap[wpCourse.id]) {
      thumbnailsSkipped++;
      continue;
    }

    const thumbnailUrl = getCourseThumbnailUrl(wpCourse);
    if (!thumbnailUrl) {
      console.log(
        `  Course ${wpCourse.id} has no featured image — keeping MIGRATION_PENDING`
      );
      continue;
    }

    const thumbKey = deterministicCourseThumbKey(thumbnailUrl);

    if (mediaMap[thumbnailUrl]) {
      courseThumbnailMap[wpCourse.id] = mediaMap[thumbnailUrl].fileKey;
      thumbnailsSkipped++;
      continue;
    }

    const existing = await getExistingMediaRef(thumbnailUrl, thumbKey);
    if (existing) {
      mediaMap[thumbnailUrl] = existing;
      courseThumbnailMap[wpCourse.id] = existing.fileKey;
      thumbnailsSkipped++;
      console.log(`  Course ${wpCourse.id} thumbnail already in S3`);
      continue;
    }

    console.log(`  Uploading thumbnail for course ${wpCourse.id}: ${thumbnailUrl}`);

    try {
      const ref = await downloadAndUpload(thumbnailUrl, thumbKey);
      mediaMap[thumbnailUrl] = ref;
      courseThumbnailMap[wpCourse.id] = ref.fileKey;
      thumbnailsUploaded++;
      imagesUploaded++;
      totalBytesUploaded += ref.fileSize;
    } catch (err) {
      const msg = `Failed to upload thumbnail for course ${wpCourse.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log(
    `  Thumbnails: ${thumbnailsUploaded} uploaded, ${thumbnailsSkipped} reused/skipped`
  );

  // Phase 3c: Inline lesson images
  console.log(`\n--- Phase 3c: Inline images (${imageUrls.length}) ---`);
  let inlineImagesUploaded = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];

    if (mediaMap[url]) continue;

    const existing = await getExistingMediaRef(url);
    if (existing) {
      mediaMap[url] = existing;
      skippedExisting++;
      continue;
    }

    console.log(`  [${i + 1}/${imageUrls.length}] Uploading inline image ${url}`);

    try {
      const ref = await downloadAndUpload(url);
      mediaMap[url] = ref;
      inlineImagesUploaded++;
      imagesUploaded++;
      totalBytesUploaded += ref.fileSize;
    } catch (err) {
      const msg = `Failed to upload inline image ${url}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log(`  Inline images: ${inlineImagesUploaded} uploaded`);

  console.log(
    `\nMedia ready: ${Object.keys(mediaMap).length} URLs in map ` +
      `(${skippedExisting + thumbnailsSkipped} reused, ` +
      `${pdfsUploaded + mp4sUploaded + thumbnailsUploaded + inlineImagesUploaded} newly uploaded, ` +
      `${totalBytesUploaded} bytes)`
  );

  return {
    mediaQueue,
    mediaMap,
    courseThumbnailMap,
    errors,
    migrationStats: {
      ...state.migrationStats,
      pdfsUploaded,
      mp4sUploaded,
      imagesUploaded,
      totalBytesUploaded,
    },
    migrationLog: [
      {
        phase: "uploadMedia",
        message: `${Object.keys(mediaMap).length} media URLs ready, ${Object.keys(courseThumbnailMap).length} thumbnails (${skippedExisting + thumbnailsSkipped} reused)`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
