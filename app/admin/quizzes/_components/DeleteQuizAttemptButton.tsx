"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteQuizAttempt } from "@/app/actions/quiz/delete-quiz-attempt";

type DeleteQuizAttemptButtonProps = {
  attemptId: string;
};

export function DeleteQuizAttemptButton({
  attemptId,
}: DeleteQuizAttemptButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz attempt?"
    );

    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteQuizAttempt(attemptId);

      if (res.status === "success") {
        toast.success("Quiz attempt deleted");
      } else {
        toast.error(res.message || "Failed to delete quiz attempt");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={handleDelete}
    >
      <Trash2 className="mr-2 size-4" />
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}