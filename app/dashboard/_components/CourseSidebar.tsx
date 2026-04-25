"use client";

import Link from "next/link";
import { CourseSidebarDataType } from "@/app/data/course/get-course-sidebar-data";
import { Button } from "@/components/ui/button";
import {
  CollapsibleContent,
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ClipboardList, Play } from "lucide-react";
import { LessonItem } from "./LessonItem";
import { usePathname } from "next/navigation";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { cn } from "@/lib/utils";

interface iAppProps {
  course: CourseSidebarDataType["course"];
}

export function CourseSidebar({ course }: iAppProps) {
  const pathname = usePathname();
  const currentId = pathname.split("/").pop();

  const { completedLessons, totalLessons, progressPercentage } =
    useCourseProgress({ courseData: course });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border pb-4 pr-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Play className="size-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight">
              {course.title}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {course.category}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedLessons}/{totalLessons} lessons
            </span>
          </div>

          <Progress value={progressPercentage} className="h-1.5" />

          <p className="text-xs text-muted-foreground">
            {progressPercentage}% complete
          </p>
        </div>
      </div>

      <div className="space-y-3 py-4 pr-4">
        {course.chapters.map((chapter, index) => (
          <Collapsible key={chapter.id} defaultOpen={index === 0}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="flex h-auto w-full items-center gap-2 p-3"
              >
                <div className="shrink-0">
                  <ChevronDown className="size-4 text-primary" />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {chapter.position}: {chapter.title}
                  </p>

                  <p className="truncate text-[10px] font-medium text-muted-foreground">
                    {chapter.lessons.length} lessons
                    {chapter.quizzes.length > 0
                      ? ` • ${chapter.quizzes.length} quiz`
                      : ""}
                  </p>
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-3 space-y-3 border-l-2 pl-6">
              {chapter.lessons.map((lesson) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  slug={course.slug}
                  isActive={currentId === lesson.id}
                  completed={lesson.lessonProgress}
                />
              ))}

              {chapter.quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/quizzes/${quiz.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-muted",
                    currentId === quiz.id &&
                      "border-primary bg-primary/10 text-primary"
                  )}
                >
                  <ClipboardList className="size-4 shrink-0" />
                  <span className="truncate">{quiz.title}</span>
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}