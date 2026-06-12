"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CourseSidebarDataType } from "@/app/data/course/get-course-sidebar-data";
import { Button } from "@/components/ui/button";
import {
  CollapsibleContent,
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ClipboardList,
  MessageCircle,
  Play,
} from "lucide-react";
import { LessonItem } from "./LessonItem";
import { QuizItem } from "./QuizItem";
import { usePathname } from "next/navigation";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { cn } from "@/lib/utils";

interface iAppProps {
  course: CourseSidebarDataType["course"];
  isEnrolled: boolean;
}

export function CourseSidebar({ course, isEnrolled }: iAppProps) {
  const pathname = usePathname();
  const currentId = pathname.split("/").pop();

  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const activeChapter = course.chapters.find((chapter) =>
      chapter.lessons.some((l) => l.id === currentId) ||
      chapter.quizzes.some((q) => q.id === currentId)
    );

    if (activeChapter) return { [activeChapter.id]: true };
    return course.chapters[0] ? { [course.chapters[0].id]: true } : {};
  });

  useEffect(() => {
    if (!currentId) return;

    const activeChapter = course.chapters.find((chapter) =>
      chapter.lessons.some((l) => l.id === currentId) ||
      chapter.quizzes.some((q) => q.id === currentId)
    );

    if (activeChapter) {
      setOpenChapters({ [activeChapter.id]: true });
    }
  }, [currentId, course.chapters]);

  const { completedLessons, totalLessons, progressPercentage } =
    useCourseProgress({ courseData: course });

  const isCommunityActive = pathname === `/dashboard/${course.slug}/community`;

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

      <div className="flex-1 space-y-3 overflow-y-auto py-4 pr-4">
        {course.chapters.map((chapter) => (
          <Collapsible 
            key={chapter.id} 
            open={!!openChapters[chapter.id]}
            onOpenChange={(isOpen) => {
              setOpenChapters((prev) => ({
                ...prev,
                [chapter.id]: isOpen,
              }));
            }}
          >
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
                  completed={
                    Array.isArray(lesson.lessonProgress)
                      ? lesson.lessonProgress.some((progress) => progress.completed)
                      : Boolean(lesson.lessonProgress)
                  }
                />
              ))}

              {chapter.quizzes.map((quiz) => {
                const highestAttempt = quiz.attempts?.[0];
                
                const isPassed = 
                  highestAttempt && quiz.passingScore !== null
                    ? (highestAttempt.score ?? 0) >= quiz.passingScore
                    : false;

                return (
                  <QuizItem
                    key={quiz.id}
                    quiz={quiz}
                    isActive={currentId === quiz.id}
                    isPassed={isPassed}
                  />
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}

        {isEnrolled && (
          <div className="border-t border-border pt-4">
            <Link
              href={`/dashboard/${course.slug}/community`}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-medium transition hover:bg-muted",
                isCommunityActive && "border-primary bg-primary/10 text-primary"
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="size-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate">Visit Community</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  Ask questions and connect with learners
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

