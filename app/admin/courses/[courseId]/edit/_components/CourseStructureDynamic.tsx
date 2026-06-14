"use client";

import dynamic from "next/dynamic";
import type { AdminCourseSingularType } from "@/app/data/admin/admin-get-course";

type CourseStructureProps = {
  data: AdminCourseSingularType;
};

export const CourseStructure = dynamic<CourseStructureProps>(
  () =>
    import("./CourseStructure").then((module) => module.CourseStructure),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[320px] animate-pulse rounded-xl border bg-muted/40" />
    ),
  }
);
