import he from "he";
import type { ActivityClassification, WPLesson, WPRenderedField, WPTopic } from "./state";

const YOUTUBE_REGEX =
  /<iframe[^>]+src="[^"]*youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^"]*"/g;

const MP4_VIDEO_REGEX = /<video[^>]+src="([^"]+\.mp4)"/gi;
const MP4_SOURCE_REGEX = /<source[^>]+src="([^"]+\.mp4)"/gi;

const PDF_BLOCK_REGEX =
  /<div[^>]+class="[^"]*wp-block-file[^"]*"[^>]*>[\s\S]*?href="([^"]+\.pdf)"/gi;
const PDF_ANCHOR_REGEX = /href="([^"]+\.pdf)"/gi;

const INLINE_IMG_SRC_REGEX = /<img[^>]+src="([^"]+)"/gi;

const REACT_CDN_NAMES = [
  "acetylcholine",
  "dopamine",
  "gaba",
  "histamine",
  "serotonin",
];

export function decodeHtml(text: unknown): string {
  const value =
    typeof text === "string"
      ? text
      : coerceRenderedHtml(text as string | WPRenderedField | null | undefined);
  if (!value) return "";
  return he.decode(value);
}

/** Coerce WP REST `content` / `title` fields that may be a string or `{ rendered }`. */
export function coerceRenderedHtml(
  value: string | WPRenderedField | null | undefined | unknown
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "rendered" in value) {
    const rendered = (value as WPRenderedField).rendered;
    if (typeof rendered === "string") return rendered;
    if (rendered == null) return "";
    return String(rendered);
  }
  return "";
}

export function stripHtmlTags(html: unknown): string {
  const text = coerceRenderedHtml(html);
  if (!text || typeof text !== "string") return "";
  return decodeHtml(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function extractYouTubeIds(html: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(YOUTUBE_REGEX.source, YOUTUBE_REGEX.flags);
  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}

export function extractMp4Urls(html: string): string[] {
  const urls: string[] = [];

  for (const regex of [MP4_VIDEO_REGEX, MP4_SOURCE_REGEX]) {
    let match: RegExpExecArray | null;
    const r = new RegExp(regex.source, regex.flags);
    while ((match = r.exec(html)) !== null) {
      urls.push(match[1]);
    }
  }

  return [...new Set(urls)];
}

export function extractPdfUrls(html: string): string[] {
  const urls = new Set<string>();

  let match: RegExpExecArray | null;
  const blockRegex = new RegExp(PDF_BLOCK_REGEX.source, PDF_BLOCK_REGEX.flags);
  while ((match = blockRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  const anchorRegex = new RegExp(PDF_ANCHOR_REGEX.source, PDF_ANCHOR_REGEX.flags);
  while ((match = anchorRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  return [...urls];
}

export function extractInlineImageUrls(html: string): string[] {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(INLINE_IMG_SRC_REGEX.source, INLINE_IMG_SRC_REGEX.flags);
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith("http")) {
      urls.push(url);
    }
  }
  return [...new Set(urls)];
}

export function rewriteImageUrlsInHtml(
  html: string,
  urlMap: Record<string, string>
): string {
  let result = html;
  for (const [wpUrl, s3Url] of Object.entries(urlMap)) {
    result = result.split(`src="${wpUrl}"`).join(`src="${s3Url}"`);
  }
  return result;
}

export function isInteractiveActivity(topic: WPTopic): boolean {
  const title = topic.title.rendered;
  const html = topic.content.rendered;

  return (
    /interactive/i.test(title) ||
    (/<script/i.test(html) &&
      /id="[^"]+-(module|root)"/i.test(html)) ||
    /Loading [A-Za-z]+ Module/i.test(html)
  );
}

export function classifyActivity(html: string): ActivityClassification {
  return {
    isReactCDN:
      /ReactDOM|React\.render|createRoot|Loading [A-Za-z]+ Module/i.test(html),
    hasFlashcard: /card-front|card-back|rotateY|Tap to Flip/i.test(html),
    hasMultipleChoice: /checkAnswer\s*\(|btn-opt|data-answer=/i.test(html),
    hasDragDrop:
      /draggable|droppable|drag.*drop|\.drag-item|\.drop-zone/i.test(html),
    hasSelectAll: /select.*all|checkbox|check.*all/i.test(html),
    hasFillBlank: /<input[^>]+type=["']text["']/i.test(html),
  };
}

export function isReactCDNActivity(topic: WPTopic): boolean {
  const classification = classifyActivity(topic.content.rendered);
  if (classification.isReactCDN) return true;

  const titleLower = decodeHtml(topic.title.rendered).toLowerCase();
  return REACT_CDN_NAMES.some((name) => titleLower.includes(name));
}

export function isStorableInteractive(topic: WPTopic): boolean {
  return isInteractiveActivity(topic);
}

export function collectMediaUrlsFromTopics(
  topics: WPTopic[]
): { pdfUrls: string[]; mp4Urls: string[]; imageUrls: string[] } {
  return collectMediaUrlsFromCurriculum([], topics);
}

export function collectMediaUrlsFromCurriculum(
  lessons: WPLesson[],
  topics: WPTopic[]
): { pdfUrls: string[]; mp4Urls: string[]; imageUrls: string[] } {
  const pdfSet = new Set<string>();
  const mp4Set = new Set<string>();
  const imageSet = new Set<string>();

  const collectFromHtml = (html: string) => {
    for (const url of extractPdfUrls(html)) {
      pdfSet.add(url);
    }
    for (const url of extractMp4Urls(html)) {
      mp4Set.add(url);
    }
    for (const url of extractInlineImageUrls(html)) {
      imageSet.add(url);
    }
  };

  for (const lesson of lessons) {
    collectFromHtml(lesson.content.rendered);
  }

  for (const topic of topics) {
    collectFromHtml(topic.content.rendered);
  }

  return {
    pdfUrls: [...pdfSet],
    mp4Urls: [...mp4Set],
    imageUrls: [...imageSet],
  };
}

/** Remove embedded video blocks so content is not duplicated alongside LessonVideo rows. */
export function htmlWithoutEmbeddedMedia(html: string): string {
  let out = html;
  out = out.replace(/<figure[^>]*class="[^"]*wp-block-video[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
  out = out.replace(MP4_VIDEO_REGEX, "");
  out = out.replace(MP4_SOURCE_REGEX, "");
  out = out.replace(YOUTUBE_REGEX, "");
  return out.replace(/\s+/g, " ").trim();
}

export function getPdfDisplayName(url: string): string {
  const filename = url.split("/").pop() ?? "document.pdf";
  return decodeHtml(filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
