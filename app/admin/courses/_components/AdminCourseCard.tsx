import type { AdminCourseType } from "@/app/data/admin/admin-get-courses";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Eye,
  MoreVertical,
  Pencil,
  School,
  Trash2,
} from "lucide-react";

import { AdminSelfEnrollButton } from "./AdminSelfEnrollButton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useConstructUrl } from "@/hooks/use-construct-url";
import { cn } from "@/lib/utils";

type AdminCourseCardProps = {
  data: AdminCourseType;
};

export function AdminCourseCard({ data }: AdminCourseCardProps) {
  const thumbnailUrl = useConstructUrl(data.fileKey);

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card py-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <div className="absolute right-3 top-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-full shadow-sm"
                aria-label="Open course actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href={`/admin/courses/${data.id}/edit`}>
                  <Pencil className="mr-2 size-4" />
                  Edit Course
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/courses/${data.slug}`}>
                  <Eye className="mr-2 size-4" />
                  Preview
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem>
                <AdminSelfEnrollButton courseId={data.id} />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/courses/${data.id}/delete`}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Course
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
            href={`/admin/courses/${data.id}/edit`}
            className="line-clamp-2 text-lg font-semibold tracking-tight transition-colors hover:text-primary"
          >
            {data.title}
          </Link>

          {data.smallDescription && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {data.smallDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <Clock3 className="size-4 text-primary" />
              <span>{data.duration}h</span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <School className="size-4 text-primary" />
              <span>{data.level}</span>
            </div>
          </div>
        </div>

        <Link
          href={`/admin/courses/${data.id}/edit`}
          className={cn(
            buttonVariants({
              className: "mt-5 w-full rounded-full",
            })
          )}
        >
          Edit Course
          <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function AdminCourseCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border bg-card py-0 shadow-sm">
      <div className="relative aspect-video w-full bg-muted">
        <div className="absolute right-3 top-3 z-10">
          <Skeleton className="size-9 rounded-full" />
        </div>

        <Skeleton className="h-full w-full" />
      </div>

      <CardContent className="p-5">
        <div className="space-y-3">
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
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