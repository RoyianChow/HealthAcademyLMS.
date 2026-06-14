import { requireUser } from "@/app/data/user/require-user";
import { getLessonContent } from "@/app/data/course/get-lesson-content";
import { CourseContent } from "./_components/CourseContent";
import { Suspense } from "react";
import { LessonSkeleton } from "./_components/LessonSkeleton";
import { parseDescriptionJson } from "@/lib/tiptap-content";
import { renderDescriptionHtml } from "@/lib/render-tiptap-html";

type Params = Promise<{ lessonId: string }>;

export default async function LessonContentPage({
  params,
}: {
  params: Params;
}) {
  const { lessonId } = await params;

  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonContentLoader lessonId={lessonId} />
    </Suspense>
  );
}

async function LessonContentLoader({ lessonId }: { lessonId: string }) {
  const data = await getLessonContent(lessonId);
  const user = await requireUser();

  const descriptionJson = data.description
    ? parseDescriptionJson(data.description)
    : null;
  const contentJson = data.content ? parseDescriptionJson(data.content) : null;

  return (
    <CourseContent
      data={data}
      userId={user.id}
      descriptionHtml={descriptionJson ? renderDescriptionHtml(descriptionJson) : null}
      contentHtml={contentJson ? renderDescriptionHtml(contentJson) : null}
    />
  );
}
