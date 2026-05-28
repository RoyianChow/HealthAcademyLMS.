import Link from "next/link";
import { MessageCircle, Users, Ban } from "lucide-react";

import { getCommunityPageData } from "@/app/data/community/get-community-page-data";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CreatePostForm } from "@/components/community/create-post-form";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const { user, course } = await getCommunityPageData(slug);

  const isBanned = Boolean(
    user.banned && user.banExpires && new Date(user.banExpires) > new Date()
  );

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

        {isBanned && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive shadow-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Ban className="size-5" />
              You are temporarily banned from participating.
            </div>
            <div className="flex flex-col gap-1 text-sm text-destructive/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-xs">Status:</span> 
                <span className="rounded bg-destructive/20 px-2 py-0.5 font-medium">Banned</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-xs">Reason:</span> 
                {user.banReason || "Violating community guidelines."}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-xs">Expires:</span> 
                {user.banExpires ? new Date(user.banExpires).toLocaleString() : "N/A"}
              </span>
            </div>
          </div>
        )}

        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              Community Guidelines
            </CardTitle>
              <p className="text-sm text-muted-foreground">
                Please keep discussions respectful, supportive, and related to the course content. Spam, harassment, offensive language, misinformation, or inappropriate content
                will not be tolerated and may result in a temporary or permanent ban from the community. 
              </p>
          </CardHeader>
        </Card>

        <div className={cn(isBanned && "pointer-events-none opacity-50 select-none")}>
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
        </div>

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
                isBanned={isBanned}
              />
            ))
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
