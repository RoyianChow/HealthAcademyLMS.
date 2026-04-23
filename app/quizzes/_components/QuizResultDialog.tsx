"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

type QuizResultDialogProps = {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number | null;
    questions: {
      id: string;
      question: string;
      explanation: string | null;
      options: {
        id: string;
        text: string;
        isCorrect: boolean;
      }[];
    }[];
    attempts: {
      id: string;
      score: number | null;
      attemptNumber: number;
      submittedAt: Date | null;
      feedback: string | null;
      answers: {
        id: string;
        questionId: string;
        selectedOptionId: string | null;
        isCorrect: boolean | null;
      }[];
    }[];
  };
};

export function QuizResultDialog({ quiz }: QuizResultDialogProps) {
  const latestAttempt = quiz.attempts[0];

  if (!latestAttempt) {
    return null;
  }

  const score = latestAttempt.score ?? 0;
  const passed =
    quiz.passingScore !== null ? score >= quiz.passingScore : score >= 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          View Result
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Attempt #{latestAttempt.attemptNumber}</Badge>

            <Badge
              className={clsx(
                passed
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : "bg-red-600 text-white hover:bg-red-600"
              )}
            >
              {passed ? "Passed" : "Failed"}
            </Badge>

            <Badge variant="outline">Score: {score}%</Badge>

            {quiz.passingScore !== null ? (
              <Badge variant="outline">Pass Mark: {quiz.passingScore}%</Badge>
            ) : null}
          </div>

          <DialogTitle className="text-2xl">{quiz.title} Result</DialogTitle>

          {latestAttempt.submittedAt ? (
            <p className="text-sm text-muted-foreground">
              Submitted on{" "}
              {new Date(latestAttempt.submittedAt).toLocaleString()}
            </p>
          ) : null}

          {latestAttempt.feedback ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium">Feedback</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {latestAttempt.feedback}
              </p>
            </div>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          {quiz.questions.map((question, index) => {
            const userAnswer = latestAttempt.answers.find(
              (answer) => answer.questionId === question.id
            );

            const selectedOption = question.options.find(
              (option) => option.id === userAnswer?.selectedOptionId
            );

            const correctOption = question.options.find(
              (option) => option.isCorrect
            );

            const gotItRight = userAnswer?.isCorrect === true;

            return (
              <div
                key={question.id}
                className="rounded-xl border border-border/60 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Question {index + 1}</Badge>

                  <Badge
                    className={clsx(
                      gotItRight
                        ? "bg-green-600 text-white hover:bg-green-600"
                        : "bg-red-600 text-white hover:bg-red-600"
                    )}
                  >
                    {gotItRight ? "Correct" : "Incorrect"}
                  </Badge>
                </div>

                <h3 className="text-base font-semibold leading-relaxed">
                  {question.question}
                </h3>

                <div className="mt-4 space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedOption?.id === option.id;
                    const isCorrect = option.isCorrect;

                    return (
                      <div
                        key={option.id}
                        className={clsx(
                          "rounded-xl border px-4 py-3 text-sm",
                          isCorrect
                            ? "border-green-600 bg-green-50"
                            : isSelected
                            ? "border-red-600 bg-red-50"
                            : "border-border/60 bg-muted/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="mr-2 font-medium">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <span>{option.text}</span>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            {isSelected ? (
                              <Badge variant="outline">Your Answer</Badge>
                            ) : null}
                            {isCorrect ? (
                              <Badge className="bg-green-600 text-white hover:bg-green-600">
                                Correct Answer
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {question.explanation ? (
                  <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                    <p className="text-sm font-medium">Explanation</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {question.explanation}
                    </p>
                  </div>
                ) : null}

                {!selectedOption && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    You did not answer this question.
                  </p>
                )}

                {!gotItRight && correctOption ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Correct answer: <span className="font-medium">{correctOption.text}</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}