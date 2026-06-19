import { env } from "@/lib/env";

export function constructPublicUrl(key?: string | null): string {
  if (!key || key.startsWith("MIGRATION_PENDING")) return "";

  const base = env.NEXT_PUBLIC_S3_PUBLIC_URL.replace(/\/$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/${encodedKey}`;
}
