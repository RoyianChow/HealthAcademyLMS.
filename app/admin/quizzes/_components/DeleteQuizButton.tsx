"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteQuiz } from "@/app/actions/quiz/delete-quiz";

type DeleteQuizButtonProps = {
  quizId: string;
};

export function DeleteQuizButton({ quizId }: DeleteQuizButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz? This will also delete all questions, options, attempts, and answers."
    );

    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteQuiz(quizId);

      if (res.status === "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
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
      {pending ? "Deleting..." : "Delete Quiz"}
    </Button>
  );
}