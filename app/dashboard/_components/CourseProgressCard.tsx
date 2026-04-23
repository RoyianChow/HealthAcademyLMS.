"use client";

import { EnrolledCourseType } from "@/app/data/user/get-enrolled-courses";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useConstructUrl } from "@/hooks/use-construct-url";
import { useCourseProgress } from "@/hooks/use-course-progress";

import Image from "next/image";
import Link from "next/link";

interface iAppProps {
  data: EnrolledCourseType;
}

export function CourseProgressCard({ data }: iAppProps) {
  const thumbnailUrl = useConstructUrl(data.fileKey);

  const { totalLessons, completedLessons, progressPercentage } =
    useCourseProgress({ courseData: data as any });

  return (
    <Card className="group relative gap-0 py-0">
      <Badge className="absolute top-2 right-2 z-10">{data.level}</Badge>

      <Image
        width={600}
        height={400}
        className="aspect-video h-full w-full rounded-t-xl object-cover"
        src={thumbnailUrl}
        alt="Thumbnail Image of Course"
      />

      <CardContent className="p-4">
        <Link
          className="line-clamp-2 text-lg font-medium transition-colors hover:underline group-hover:text-primary"
          href={`/dashboard/${data.slug}`}
        >
          {data.title}
        </Link>

        <p className="mt-2 line-clamp-2 text-sm leading-tight text-muted-foreground">
          {data.smallDescription}
        </p>

        <div className="mt-5 space-y-4">
          <div className="mb-1 flex justify-between text-sm">
            <p>Progress:</p>
            <p className="font-medium">{progressPercentage}%</p>
          </div>

          <Progress value={progressPercentage} className="h-1.5" />

          <p className="mt-1 text-xs text-muted-foreground">
            {completedLessons} of {totalLessons} lessons completed
          </p>
        </div>

        <Link
          href={`/dashboard/${data.slug}`}
          className={buttonVariants({ className: "mt-4 w-full" })}
        >
          Learn More
        </Link>
      </CardContent>
    </Card>
  );
}