import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { deterministicFileKey } from "./idempotency";
import type { MediaRef } from "./state";

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
  if (!bucket) {
    throw new Error("S3_BUCKET_NAME environment variable is required");
  }
  return bucket;
}

function getPublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_S3_PUBLIC_URL environment variable is required");
  }
  return url.replace(/\/$/, "");
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

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}

export async function downloadFromWp(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = sanitizeFilename(url.split("/").pop() ?? "file");
  const contentType =
    res.headers.get("content-type") ?? contentTypeFromUrl(url);

  return { buffer, contentType, filename };
}

export async function uploadToS3(
  wpUrl: string,
  buffer: Buffer,
  contentType: string,
  fileKeyOverride?: string
): Promise<MediaRef> {
  const s3 = getS3Client();
  const bucket = getBucket();
  const publicUrl = getPublicUrl();
  const fileKey = fileKeyOverride ?? deterministicFileKey(wpUrl);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
      ACL: "public-read",
    })
  );

  return {
    fileKey,
    fileUrl: `${publicUrl}/${fileKey}`,
    fileSize: buffer.length,
    contentType,
  };
}

export async function downloadAndUpload(
  wpUrl: string,
  fileKeyOverride?: string
): Promise<MediaRef> {
  const { buffer, contentType } = await downloadFromWp(wpUrl);
  return uploadToS3(wpUrl, buffer, contentType, fileKeyOverride);
}
