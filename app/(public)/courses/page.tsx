import { Suspense } from "react";
import { getAllCourses } from "@/app/data/course/get-all-courses";
import {
  PublicCourseCard,
  PublicCourseCardSkeleton,
} from "../_components/PublicCourseCard";

export const dynamic = "force-dynamic";

export default function PublicCoursesRoute() {
  return (
    <div className="w-full py-8 md:py-12">
      <section className="mb-10 md:mb-14">
        <div className="overflow-hidden rounded-3xl bg-white border border-border/60 bg-gradient-to-br from-muted/50 via-background to-muted/30">
          <div className="flex flex-col gap-6 px-6 py-10 md:px-10 md:py-14 lg:px-14">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground shadow-sm">
                Course Catalog
              </span>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Explore Courses
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Discover thoughtfully designed courses that help you build
                practical knowledge, strengthen your skills, and move forward
                with confidence in your learning journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<LoadingSkeletonLayout />}>
        <RenderCourses />
      </Suspense>
    </div>
  );
}

async function RenderCourses() {
  const courses = await getAllCourses();

  if (courses.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">No courses yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          We&apos;re preparing new learning experiences. Check back soon for
          upcoming courses and fresh content.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            Available Courses
          </h2>
          <p className="text-sm text-muted-foreground">
            {courses.length} course{courses.length > 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="transition-transform duration-200 hover:-translate-y-1"
          >
            <PublicCourseCard data={course} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingSkeletonLayout() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="transition-opacity duration-200"
          >
            <PublicCourseCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}