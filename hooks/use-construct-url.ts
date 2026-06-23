export function useConstructUrl(key?: string | null): string {
  if (!key) return "";

  const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;

  if (!publicUrl) {
    console.warn("Missing env: NEXT_PUBLIC_S3_PUBLIC_URL");
    return "";
  }

  const safeKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${publicUrl.replace(/\/$/, "")}/${safeKey}`;
}