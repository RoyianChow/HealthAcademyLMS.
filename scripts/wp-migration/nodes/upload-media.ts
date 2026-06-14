import { collectMediaUrlsFromTopics } from "../content-parser";
import { downloadAndUpload } from "../s3-uploader";
import type { MediaRef, MigrationState } from "../state";

export async function uploadMediaNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 3: Uploading media to S3 ===");

  const { pdfUrls, mp4Urls } = collectMediaUrlsFromTopics(state.wpTopics);
  const mediaQueue = [...new Set([...pdfUrls, ...mp4Urls])];

  console.log(
    `Media queue: ${mediaQueue.length} unique files (${pdfUrls.length} PDFs, ${mp4Urls.length} MP4s)`
  );

  const mediaMap: Record<string, MediaRef> = { ...state.mediaMap };
  const errors: string[] = [];
  let pdfsUploaded = 0;
  let mp4sUploaded = 0;
  let totalBytesUploaded = 0;

  for (let i = 0; i < mediaQueue.length; i++) {
    const url = mediaQueue[i];
    console.log(`  [${i + 1}/${mediaQueue.length}] Uploading ${url}`);

    try {
      const ref = await downloadAndUpload(url);
      mediaMap[url] = ref;
      totalBytesUploaded += ref.fileSize;

      if (url.toLowerCase().endsWith(".pdf")) pdfsUploaded++;
      if (url.toLowerCase().endsWith(".mp4")) mp4sUploaded++;
    } catch (err) {
      const msg = `Failed to upload ${url}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log(
    `Uploaded ${Object.keys(mediaMap).length} files (${totalBytesUploaded} bytes)`
  );

  return {
    mediaQueue,
    mediaMap,
    errors,
    migrationStats: {
      ...state.migrationStats,
      pdfsUploaded,
      mp4sUploaded,
      totalBytesUploaded,
    },
    migrationLog: [
      {
        phase: "uploadMedia",
        message: `Uploaded ${Object.keys(mediaMap).length}/${mediaQueue.length} media files`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
