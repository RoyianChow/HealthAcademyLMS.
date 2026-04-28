// app/dashboard/quizzes/[quizId]/_components/QuizBackButton.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type QuizBackButtonProps = {
  href: string;
  label: string;
  shouldWarn?: boolean;
};

export function QuizBackButton({
  href,
  label,
  shouldWarn = true,
}: QuizBackButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleBackClick() {
    if (!shouldWarn) {
      router.push(href);
      return;
    }

    setOpen(true);
  }

  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarn]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="gap-2 px-0"
        onClick={handleBackClick}
      >
        <ArrowLeft className="size-4" />
        {label}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Your quiz timer will continue running even if you leave this page.
              Make sure you are ready before going back to the course.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Quiz</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(href)}>
              Go Back Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}