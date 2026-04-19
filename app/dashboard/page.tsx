import { EmptyState } from "@/components/general/EmptyState";
import { getAllCourses } from "../data/course/get-all-courses";
import { getEnrolledCourses } from "../data/user/get-enrolled-courses";
import { PublicCourseCard } from "../(public)/_components/PublicCourseCard";
import { CourseProgressCard } from "./_components/CourseProgressCard";

export default async function DashboardPage() {
  const [courses, enrolledCourses] = await Promise.all([
    getAllCourses(),
    getEnrolledCourses(),
  ]);

  const availableCourses = courses.filter(
    (course) =>
      !enrolledCourses.some(({ Course: enrolled }) => enrolled.id === course.id)
  );

  return (
    <div className="space-y-12 pb-10">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-muted/50 via-background to-muted/30">
        <div className="flex flex-col gap-6 px-6 py-10 md:px-10 md:py-12 lg:px-12">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground shadow-sm">
              Student Dashboard
            </span>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Continue Your Learning Journey
            </h1>

            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Track your active courses, continue where you left off, and
              discover new courses to expand your knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {enrolledCourses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Available Courses</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {availableCourses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-muted-foreground">Learning Status</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {enrolledCourses.length > 0
                  ? "Keep up the momentum"
                  : "Start your first course"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Enrolled Courses
          </h2>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            Courses you already have access to and can continue anytime.
          </p>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-2">
            <EmptyState
              title="No courses purchased"
              description="You haven't purchased any courses yet."
              buttonText="Browse Courses"
              href="/courses"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {enrolledCourses.map((course) => (
              <div
                key={course.Course.id}
                className="transition-transform duration-200 hover:-translate-y-1"
              >
                <CourseProgressCard data={course} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Available Courses
          </h2>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            Explore more courses available for purchase and continue building
            your skills.
          </p>
        </div>

        {availableCourses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-2">
            <EmptyState
              title="No courses available"
              description="You have already purchased all available courses."
              buttonText="Browse Courses"
              href="/courses"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="transition-transform duration-200 hover:-translate-y-1"
              >
                <PublicCourseCard data={course} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}