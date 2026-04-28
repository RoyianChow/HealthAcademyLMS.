import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Users } from "lucide-react";

import { requireUser } from "@/app/data/user/require-user";
import { prisma } from "@/lib/db";
import { CourseStatus, EnrollmentStatus } from "@/src/generated/prisma";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CreatePostForm } from "@/components/community/create-post-form";
import { CommunityPostCard } from "@/components/community/community-post-card";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const POSTS_LIMIT = 50;

export default async function CommunityPage({ params }: PageProps) {
  const user = await requireUser();
  const { slug } = await params;

  if (!slug) {
    return notFound();
  }

  const course = await prisma.course.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      enrollments: {
        where: {
          userId: user.id,
          status: EnrollmentStatus.Active,
        },
        take: 1,
        select: {
          id: true,
        },
      },
      communityPosts: {
        take: POSTS_LIMIT,
        orderBy: [
          {
            isPinned: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          comments: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          likes: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: EnrollmentStatus.Active,
            },
          },
          communityPosts: true,
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const isAdmin = user.role?.toLowerCase() === "admin";
  const isEnrolled = course.enrollments.length > 0;

  if (course.status !== CourseStatus.Published && !isAdmin) {
    return notFound();
  }

  if (!isEnrolled && !isAdmin) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Users className="size-4" />
                Course Community
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {course.title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Ask questions, share updates, discuss lessons, and connect
                  with other learners enrolled in this course.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full sm:w-auto",
                })}
              >
                My Courses
              </Link>

              <Link
                href={`/dashboard/${course.slug}`}
                className={buttonVariants({
                  className: "w-full sm:w-auto",
                })}
              >
                Continue Course
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Active learners</p>
              <p className="mt-1 text-2xl font-semibold">
                {course._count.enrollments}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Community posts</p>
              <p className="mt-1 text-2xl font-semibold">
                {course._count.communityPosts}
              </p>
            </div>
          </div>
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="size-5 text-primary" />
              Start a discussion
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Post course questions, lesson feedback, helpful resources, or
              updates for other learners.
            </p>
          </CardHeader>

          <CardContent>
            <CreatePostForm courseId={course.id} slug={course.slug} />
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent discussions</h2>

            {course.communityPosts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing latest {course.communityPosts.length} posts
              </p>
            )}
          </div>

          {course.communityPosts.length > 0 ? (
            course.communityPosts.map((post) => (
<CommunityPostCard
  key={post.id}
  post={post}
  userId={user.id}
  isAdmin={user.role === "admin"}
/>            ))
          ) : (
            <Card className="border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
                  <MessageCircle className="size-6" />
                </div>

                <h3 className="text-lg font-semibold">No posts yet</h3>

                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Be the first to start a discussion in this course community.
                  You can ask a question, share a useful resource, or post an
                  update.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}