// app/admin/courses/_components/AdminSelfEnrollButton.tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminSelfEnrollCourse } from "@/app/data/admin/admin-self-enroll-course";

type AdminSelfEnrollButtonProps = {
  courseId: string;
};

export function AdminSelfEnrollButton({
  courseId,
}: AdminSelfEnrollButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleEnroll() {
    startTransition(async () => {
      const res = await adminSelfEnrollCourse(courseId);

      if (res.status === "error") {
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
    });
  }

  return (
    <Button onClick={handleEnroll} disabled={isPending} variant="default" size="sm" className="w-full hover:bg-primary/90">
      {isPending ? "Enrolling..." : "Enroll"}
    </Button>
  );
}