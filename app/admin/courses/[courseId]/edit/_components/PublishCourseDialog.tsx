"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type CourseContentPublishCounts = {
  draftLessons: number;
  publishedLessons: number;
  draftQuizzes: number;
  publishedQuizzes: number;
};

type PublishCourseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: CourseContentPublishCounts;
  pending: boolean;
  onPublishCourseOnly: () => void;
  onPublishAllContent: () => void;
};

export function PublishCourseDialog({
  open,
  onOpenChange,
  counts,
  pending,
  onPublishCourseOnly,
  onPublishAllContent,
}: PublishCourseDialogProps) {
  const { draftLessons, publishedLessons, draftQuizzes, publishedQuizzes } =
    counts;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>How should this course be published?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This course has{" "}
                <span className="font-medium text-foreground">
                  {publishedLessons} published
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground">
                  {draftLessons} draft
                </span>{" "}
                lesson{draftLessons === 1 ? "" : "s"},{" "}
                <span className="font-medium text-foreground">
                  {publishedQuizzes} published
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground">
                  {draftQuizzes} draft
                </span>{" "}
                quiz{draftQuizzes === 1 ? "" : "zes"}.
              </p>
              <p>
                Choose whether learners should only see content that is already
                published, or publish every lesson and quiz in this course.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            disabled={pending}
            onClick={onPublishAllContent}
          >
            Publish course and all content
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onPublishCourseOnly}
          >
            Publish course only (keep drafts hidden)
          </Button>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function getCourseContentPublishCounts(
  chapters: {
    lessons: { isPublished: boolean }[];
    quizzes: { isPublished: boolean }[];
  }[]
): CourseContentPublishCounts {
  let draftLessons = 0;
  let publishedLessons = 0;
  let draftQuizzes = 0;
  let publishedQuizzes = 0;

  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      if (lesson.isPublished) publishedLessons++;
      else draftLessons++;
    }
    for (const quiz of chapter.quizzes) {
      if (quiz.isPublished) publishedQuizzes++;
      else draftQuizzes++;
    }
  }

  return {
    draftLessons,
    publishedLessons,
    draftQuizzes,
    publishedQuizzes,
  };
}
