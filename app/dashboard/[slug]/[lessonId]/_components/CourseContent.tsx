// app\dashboard\[slug]\[lessonId]\_components\CourseContent.tsx
"use client";

import { useMemo, useTransition, useEffect, useRef } from "react";
import type { LessonContentType } from "@/app/data/course/get-lesson-content";
import {
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { useConfetti } from "@/hooks/use-confetti";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { markLessonComplete } from "../actions";

type CourseContentProps = {
  data: LessonContentType;
  userId: string;
  descriptionHtml?: string | null;
  contentHtml?: string | null;
};

function getYoutubeEmbedUrl(url?: string | null) {
  if (!url) return null;

  try {
    const cleanUrl = url.trim();

    if (!cleanUrl) return null;

    const parsedUrl = new URL(cleanUrl);

    if (parsedUrl.hostname.includes("youtube.com")) {
      if (parsedUrl.pathname.startsWith("/embed/")) {
        return cleanUrl;
      }

      const videoId = parsedUrl.searchParams.get("v");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return null;

  const units = ["B", "KB", "MB", "GB"] as const;
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

function VideoPlayer({
  thumbnailKey,
  videoKey,
  youtubeUrl,
}: {
  thumbnailKey?: string | null;
  videoKey?: string | null;
  youtubeUrl?: string | null;
}) {
  const videoUrl = useConstructUrl(videoKey ?? "");
  const thumbnailUrl = useConstructUrl(thumbnailKey ?? "");
  const youtubeEmbedUrl = getYoutubeEmbedUrl(youtubeUrl);

  if (youtubeEmbedUrl) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-sm">
        <iframe
          src={youtubeEmbedUrl}
          title="Lesson video"
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (!videoKey) {
    return null;
  }

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-sm">
      <video
        className="h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
        poster={thumbnailKey ? thumbnailUrl : undefined}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        <source src={videoUrl} type="video/ogg" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function LessonDocumentItem({
  document,
}: {
  document: LessonContentType["documents"][number];
}) {
  const constructedUrl = useConstructUrl(document.fileKey);
  const documentUrl = document.fileUrl || constructedUrl;
  const fileSize = formatFileSize(document.fileSize);

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
          <FileText className="size-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {document.name}
          </p>

          {(document.fileType || fileSize) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {document.fileType && <span>{document.fileType}</span>}
              {document.fileType && fileSize && <span aria-hidden="true">•</span>}
              {fileSize && <span>{fileSize}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={documentUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 size-4" />
            View
          </a>
        </Button>

        <Button variant="outline" size="sm" asChild>
          <a href={documentUrl} download={document.name}>
            <Download className="mr-2 size-4" />
            Download
          </a>
        </Button>
      </div>
    </article>
  );
}

function InteractiveScriptPlayer({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const completeHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background-color: transparent;
            }
            #interactive-container {
              width: 100%;
              height: auto;
              position: absolute;
              top: 0;
              left: 0;
            }
          </style>
        </head>
        <body>
          <div id="interactive-container">
            ${html}
          </div>
          <script>
            let currentHeight = 0;
            function resizeIframe() {
              const container = document.getElementById('interactive-container');
              if (!container) return;
              
              const height = container.getBoundingClientRect().height;
              
              if (Math.abs(height - currentHeight) > 4) {
                currentHeight = height;
                window.parent.postMessage({
                  type: 'RESIZE_IFRAME',
                  height: Math.ceil(height)
                }, '*');
              }
            }
            
            if (window.ResizeObserver) {
              const ro = new ResizeObserver(() => {
                // Request animation frame prevents rapid loop synchronization crashes
                window.requestAnimationFrame(resizeIframe);
              });
              ro.observe(document.getElementById('interactive-container'));
            } else {
              const observer = new MutationObserver(resizeIframe);
              observer.observe(document.body, { attributes: true, childList: true, subtree: true });
            }
            
            window.addEventListener('load', resizeIframe);
            window.addEventListener('resize', resizeIframe);
            
            // Safety sweeps for late framework executions
            setTimeout(resizeIframe, 200);
            setTimeout(resizeIframe, 800);
          </script>
        </body>
      </html>
    `;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(completeHtml);
      doc.close();
    }
  }, [html]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'RESIZE_IFRAME' && iframeRef.current) {
        const newHeight = event.data.height + 16;
        const cachedHeight = parseInt(iframeRef.current.style.height || "0", 10);
        
        // Parent guard rule: Only mutation-paint DOM if structural changes pass a delta threshold
        if (Math.abs(newHeight - cachedHeight) > 5) {
          iframeRef.current.style.height = `${newHeight}px`;
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-card border border-muted shadow-sm">
      <iframe
        ref={iframeRef}
        title="Interactive Script Frame"
        className="w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        scrolling="no"
        style={{ height: '350px' }}
      />
    </div>
  );
}

export function CourseContent({
  data,
  userId,
  descriptionHtml,
  contentHtml,
}: CourseContentProps) {
  const [pending, startTransition] = useTransition();
  const { triggerConfetti } = useConfetti();

  type ProgressItem = { completed: boolean; userId: string };
  const isCompleted = Array.isArray(data.lessonProgress)
    ? data.lessonProgress.some(
        (progress: ProgressItem) => progress.completed && progress.userId === userId
      )
    : Boolean(
        data.lessonProgress &&
        (data.lessonProgress as ProgressItem).completed &&
        (data.lessonProgress as ProgressItem).userId === userId
      );

  function onSubmit() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        markLessonComplete(data.id, data.chapter.course.slug)
      );

      if (error || !result) {
        toast.error("An unexpected error occurred. Please try again.");
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        triggerConfetti();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <main className="flex h-full w-full flex-col bg-background px-4 pb-8 md:px-6 overflow-y-auto">
      <div className="border-b py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSubmit}
          disabled={pending || isCompleted}
          className={
            isCompleted
              ? "bg-green-500/10 text-green-600 hover:text-green-600"
              : undefined
          }
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 size-4 text-green-500" />
          )}

          {isCompleted ? "Completed" : "Mark as Complete"}
        </Button>
      </div>

      <section className="w-full space-y-6 pt-4">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {data.title}
          </h1>

          {descriptionHtml ? (
            <div
              className="prose max-w-none w-full dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : data.description ? (
            <p className="text-sm text-muted-foreground">
              Lesson description could not be displayed.
            </p>
          ) : null}
        </div>

        {contentHtml && (
          <div className="pt-4 border-t border-muted">
            <div
              className="prose max-w-none w-full dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
        )}


        {data.documents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Documents</h2>

            <div className="grid gap-3">
              {data.documents.map((document) => (
                <LessonDocumentItem key={document.id} document={document} />
              ))}
            </div>
          </div>
        )}

        {data.videos && data.videos.length > 0 && (
          <div className="flex flex-col gap-6 w-full mb-4">
            {data.videos.map((video) => (
              <div key={video.id} className="space-y-2">
                {video.title && (
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
                    {video.title}
                  </h3>
                )}
                <VideoPlayer
                  thumbnailKey={data.thumbnailKey}
                  videoKey={video.videoKey}
                  youtubeUrl={video.youtubeUrl}
                />
              </div>
            ))}
          </div>
        )}

        {/* INTERACTIVE SCRIPT DISPLAY SECTION */}
        {data.interactiveScript && (
          <div className="space-y-3 pt-4 border-t border-muted">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Interactive Activity
            </h2>
            <InteractiveScriptPlayer html={data.interactiveScript} />
          </div>
        )}
      </section>
    </main>
  );
}
