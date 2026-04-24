// app/admin/courses/[courseId]/[chapterId]/[lessonId]/page.tsx

import { notFound } from "next/navigation";
import { adminGetLesson } from "@/app/data/admin/admin-get-lesson";
import { LessonForm } from "./_components/LessonForm";

type PageProps = {
  params: {
    courseId: string;
    chapterId: string;
    lessonId: string;
  };
};

export default async function LessonIdPage({ params }: PageProps) {
  const { courseId, chapterId, lessonId } = params;

  const lesson = await adminGetLesson(lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Lesson
        </h1>
        <p className="text-muted-foreground">
          Update your lesson content, media, and settings.
        </p>
      </div>

      <LessonForm
        data={lesson}
        chapterId={chapterId}
        courseId={courseId}
      />
    </div>
  );
}