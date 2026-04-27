"use client";

import type { ComponentProps } from "react";
import { useMemo, useTransition } from "react";
import {
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import type { LessonContentType } from "@/app/data/course/get-lesson-content";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { useConfetti } from "@/hooks/use-confetti";
import { useConstructUrl } from "@/hooks/use-construct-url";

import { markLessonComplete } from "../actions";

type CourseContentProps = {
  data: LessonContentType;
};

type RenderDescriptionJson = ComponentProps<typeof RenderDescription>["json"];

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

function parseDescription(description?: string | null) {
  if (!description) return null;

  try {
    return JSON.parse(description) as RenderDescriptionJson;
  } catch {
    return null;
  }
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

export function CourseContent({ data }: CourseContentProps) {
  const [pending, startTransition] = useTransition();
  const { triggerConfetti } = useConfetti();

  const descriptionJson = useMemo(
    () => parseDescription(data.description),
    [data.description]
  );

const isCompleted = Array.isArray(data.lessonProgress)
  ? data.lessonProgress.some((progress) => progress.completed)
  : Boolean(data.lessonProgress);
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
    <main className="flex h-full w-full flex-col bg-background px-4 pb-8 md:px-6">
      <VideoPlayer
        thumbnailKey={data.thumbnailKey}
        videoKey={data.videoKey}
        youtubeUrl={data.youtubeUrl}
      />

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

          {descriptionJson ? (
            <RenderDescription json={descriptionJson} />
          ) : data.description ? (
            <p className="text-sm text-muted-foreground">
              Lesson description could not be displayed.
            </p>
          ) : null}
        </div>

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
      </section>
    </main>
  );
}