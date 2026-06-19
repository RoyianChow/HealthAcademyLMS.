import { constructPublicUrl } from "@/lib/construct-public-url";

export function useConstructUrl(key?: string | null): string {
  return constructPublicUrl(key);
}
