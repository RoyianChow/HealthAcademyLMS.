import Link from "next/link";
import { BookOpen, MessageCircle, ArrowRight, Users } from "lucide-react";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardCommunityPage() {
  const user = await requireUser();

  const courses = await prisma.course.findMany({
    where: {
      status: "Published",
      enrollments: {
        some: {
          userId: user.id,
          status: "Active",
        },
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      smallDescription: true,
      description: true,
      level: true,
      category: true,
      enrollments: {
        where: {
          status: "Active",
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <section className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Course Communities
        </Badge>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Your Communities
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Join the community spaces for the courses you are currently enrolled
            in. Ask questions, connect with other learners, and stay engaged with
            your course discussions.
          </p>
        </div>
      </section>

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Users className="size-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                No communities available yet
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                You need to be enrolled in an active course before you can access
                its community.
              </p>
            </div>

            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="group flex h-full flex-col transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <MessageCircle className="size-6 text-primary" />
                  </div>

                  {course.level ? (
                    <Badge variant="outline">{course.level}</Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <CardTitle className="line-clamp-2 text-xl">
                    {course.title}
                  </CardTitle>

                  <CardDescription className="line-clamp-3">
                    {course.smallDescription ||
                      course.description ||
                      "Access discussions, updates, and learner support for this course."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="mt-auto flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {course.category ? (
                    <Badge variant="secondary">{course.category}</Badge>
                  ) : null}

                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-4" />
                    <span>{course.enrollments.length} enrolled</span>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/dashboard/${course.slug}/community`}>
                    Open Community
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}