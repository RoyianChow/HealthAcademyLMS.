"use client";

import type { EnrolledCourseType } from "@/app/data/user/get-enrolled-courses";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { cn } from "@/lib/utils";

type CourseProgressCardProps = {
  data: EnrolledCourseType;
};

export function CourseProgressCard({ data }: CourseProgressCardProps) {
  const thumbnailUrl = useConstructUrl(data.fileKey);

  const { totalLessons, completedLessons, progressPercentage } =
    useCourseProgress({ courseData: data });

  const safeProgress = Math.min(Math.max(progressPercentage, 0), 100);

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card py-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Badge className="absolute right-3 top-3 z-10 rounded-full shadow-sm">
          {data.level}
        </Badge>

        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${data.title} course thumbnail`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <BookOpen className="size-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <CardContent className="flex h-full flex-col p-5">
        <div className="flex-1 space-y-3">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight">
            {data.title}
          </h3>

          {data.smallDescription ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {data.smallDescription}
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No course description available.
            </p>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Progress</p>
              <p className="font-semibold">{safeProgress}%</p>
            </div>

            <Progress value={safeProgress} className="h-2" />

            <p className="text-xs text-muted-foreground">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/dashboard/${data.slug}/community`}
            className={cn(
              buttonVariants({
                variant: "outline",
                className: "w-full rounded-full",
              })
            )}
          >
            <MessageCircle className="mr-2 size-4" />
            Community
          </Link>

          <Link
            href={`/dashboard/${data.slug}`}
            className={cn(
              buttonVariants({
                className: "w-full rounded-full",
              })
            )}
          >
            Continue
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}