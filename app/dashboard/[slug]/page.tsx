import { getCourseSidebarData } from "@/app/data/course/get-course-sidebar-data";
import Link from "next/link";
import { redirect } from "next/navigation";

interface iAppProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseSlugRoute({ params }: iAppProps) {
  const { slug } = await params;

  const course = await getCourseSidebarData(slug);

  const firstChapter = course.course.chapters[0];
  const firstLesson = firstChapter?.lessons[0];
  const firstQuiz = firstChapter?.quizzes?.[0];

  if (firstLesson) {
    redirect(`/dashboard/${slug}/${firstLesson.id}`);
  }

  if (firstQuiz) {
    redirect(`/quizzes/${firstQuiz.id}`);
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <span className="text-xl">📚</span>
        </div>

        <h2 className="text-xl font-semibold tracking-tight">
          No lessons available
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This course doesn’t have any lessons yet. Please check back later or
          explore other courses.
        </p>

        <div className="mt-6">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center rounded-full border border-border bg-accent px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}