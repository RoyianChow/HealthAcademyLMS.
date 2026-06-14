import he from "he";
import type { ActivityClassification, WPRenderedField, WPTopic } from "./state";

const YOUTUBE_REGEX =
  /<iframe[^>]+src="[^"]*youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^"]*"/g;

const MP4_VIDEO_REGEX = /<video[^>]+src="([^"]+\.mp4)"/gi;
const MP4_SOURCE_REGEX = /<source[^>]+src="([^"]+\.mp4)"/gi;

const PDF_BLOCK_REGEX =
  /<div[^>]+class="[^"]*wp-block-file[^"]*"[^>]*>[\s\S]*?href="([^"]+\.pdf)"/gi;
const PDF_ANCHOR_REGEX = /href="([^"]+\.pdf)"/gi;

const REACT_CDN_NAMES = [
  "acetylcholine",
  "dopamine",
  "gaba",
  "histamine",
  "serotonin",
];

export function decodeHtml(text: string): string {
  return he.decode(text);
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
  if (!text) return "";
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
  return isInteractiveActivity(topic) && !isReactCDNActivity(topic);
}

export function collectMediaUrlsFromTopics(
  topics: WPTopic[]
): { pdfUrls: string[]; mp4Urls: string[] } {
  const pdfSet = new Set<string>();
  const mp4Set = new Set<string>();

  for (const topic of topics) {
    for (const url of extractPdfUrls(topic.content.rendered)) {
      pdfSet.add(url);
    }
    for (const url of extractMp4Urls(topic.content.rendered)) {
      mp4Set.add(url);
    }
  }

  return {
    pdfUrls: [...pdfSet],
    mp4Urls: [...mp4Set],
  };
}

export function getPdfDisplayName(url: string): string {
  const filename = url.split("/").pop() ?? "document.pdf";
  return decodeHtml(filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
