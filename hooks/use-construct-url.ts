import { env } from "@/lib/env";

export function useConstructUrl(key?: string | null): string {
  if (!key) return "";

  const bucket = env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES;

  if (!bucket) {
    console.warn("Missing S3 bucket env: NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES");
    return "";
  }

  return `https://${bucket}.fly.storage.tigris.dev/${encodeURIComponent(key)}`;
}