"use client";

import { LessonContentType } from "@/app/data/course/get-lesson-content";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { useConstructUrl } from "@/hooks/use-construct-url";
import {
  BookIcon,
  CheckCircle,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { useTransition } from "react";
import { markLessonComplete } from "../actions";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/use-confetti";

interface iAppProps {
  data: LessonContentType;
}

function getYoutubeEmbedUrl(url: string) {
  try {
    if (!url) return null;

    if (url.includes("youtube.com/watch")) {
      const parsedUrl = new URL(url);
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.includes("youtube.com/embed/")) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

function formatFileSize(size?: number | null) {
  if (!size) return null;

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

export function CourseContent({ data }: iAppProps) {
  const [pending, startTransition] = useTransition();
  const { triggerConfetti } = useConfetti();

  function VideoPlayer({
    thumbnailKey,
    videoKey,
    youtubeUrl,
  }: {
    thumbnailKey?: string;
    videoKey?: string;
    youtubeUrl?: string | null;
  }) {
    const videoUrl = videoKey ? useConstructUrl(videoKey) : "";
    const thumbnailUrl = thumbnailKey ? useConstructUrl(thumbnailKey) : "";
    const youtubeEmbedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null;

    if (youtubeEmbedUrl) {
      return (
        <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
          <iframe
            src={youtubeEmbedUrl}
            title="Lesson Video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    if (!videoKey) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
          <BookIcon className="size-16 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            This lesson does not have a video yet
          </p>
        </div>
      );
    }

    return (
      <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
        <video
          className="w-full h-full object-cover"
          controls
          poster={thumbnailUrl || undefined}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/webm" />
          <source src={videoUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  function onSubmit() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        markLessonComplete(data.id, data.Chapter.Course.slug)
      );

      if (error) {
        toast.error("An unexpected error occurred. Please try again.");
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        triggerConfetti();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex h-full w-full flex-col bg-background pl-6">
      <VideoPlayer
        thumbnailKey={data.thumbnailKey ?? ""}
        videoKey={data.videoKey ?? ""}
        youtubeUrl={data.youtubeUrl ?? ""}
      />

      <div className="py-4 border-b">
        {data.lessonProgress.length > 0 ? (
          <Button
            variant="outline"
            className="bg-green-500/10 text-green-500 hover:text-green-600"
          >
            <CheckCircle className="size-4 mr-2 text-green-500" />
            Completed
          </Button>
        ) : (
          <Button variant="outline" onClick={onSubmit} disabled={pending}>
            <CheckCircle className="size-4 mr-2 text-green-500" />
            Mark as Complete
          </Button>
        )}
      </div>

      <div className="w-full space-y-6 pt-3 pb-8">
        <div className="space-y-3">
          <h1 className="w-full text-3xl font-bold tracking-tight text-foreground">
            {data.title}
          </h1>

          {data.description && (
            <RenderDescription json={JSON.parse(data.description)} />
          )}
        </div>

        {data.documents && data.documents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Documents</h2>

            <div className="grid gap-3">
              {data.documents.map((doc) => {
                const documentUrl = doc.fileUrl || useConstructUrl(doc.fileKey);

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                        <FileText className="size-5 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {doc.name}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          {doc.fileType && <span>{doc.fileType}</span>}
                          {doc.fileType && doc.fileSize ? <span>•</span> : null}
                          {doc.fileSize ? (
                            <span>{formatFileSize(doc.fileSize)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-4 mr-2" />
                          View
                        </a>
                      </Button>

                      <Button variant="outline" size="sm" asChild>
                        <a href={documentUrl} download={doc.name}>
                          <Download className="size-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 