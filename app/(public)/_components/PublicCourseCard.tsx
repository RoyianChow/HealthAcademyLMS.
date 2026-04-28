import type { PublicCourseType } from "@/app/data/course/get-all-courses";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, School } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { cn } from "@/lib/utils";

type PublicCourseCardProps = {
  data: PublicCourseType;
};

export function PublicCourseCard({ data }: PublicCourseCardProps) {
  const thumbnailUrl = useConstructUrl(data.fileKey);

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card py-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Badge className="absolute right-3 top-3 z-10 rounded-full shadow-sm">
          {data.level}
        </Badge>

        <Image
          src={thumbnailUrl}
          alt={`${data.title} course thumbnail`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <CardContent className="flex h-full flex-col p-5">
        <div className="flex-1 space-y-3">
          <Link
            href={`/courses/${data.slug}`}
            className="line-clamp-2 text-lg font-semibold tracking-tight transition-colors hover:text-primary"
          >
            {data.title}
          </Link>

          {data.smallDescription && (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {data.smallDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <Clock3 className="size-4 text-primary" />
              <span>{data.duration}h</span>
            </div>

            <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <School className="size-4 shrink-0 text-primary" />
              <span className="truncate">{data.category}</span>
            </div>
          </div>
        </div>

        <Link
          href={`/courses/${data.slug}`}
          className={cn(
            buttonVariants({
              className: "mt-5 w-full rounded-full",
            })
          )}
        >
          Learn More
          <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function PublicCourseCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border bg-card py-0 shadow-sm">
      <div className="relative aspect-video w-full bg-muted">
        <div className="absolute right-3 top-3 z-10">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <Skeleton className="h-full w-full" />
      </div>

      <CardContent className="p-5">
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <Skeleton className="mt-5 h-10 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}