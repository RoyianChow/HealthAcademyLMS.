"use client";

import { useTransition } from "react";
import { startQuizAttempt } from "../action";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function QuizStartButton({
  quizId,
  attemptNumber,
  isRetake,
}: {
  quizId: string;
  attemptNumber: number;
  isRetake: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      try {
        await startQuizAttempt(quizId, attemptNumber);
        toast.success(`Attempt #${attemptNumber} has started!`);
      } catch (error) {
        toast.error("Failed to start quiz attempt.");
      }
    });
  }

  return (
    <Button
      onClick={handleStart}
      disabled={isPending}
      className="rounded-full shadow-sm"
    >
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : isRetake ? (
        <RotateCcw className="mr-2 size-4" />
      ) : (
        <PlayCircle className="mr-2 size-4" />
      )}
      {isRetake ? "Retake Quiz" : "Start Quiz"}
    </Button>
  );
}
