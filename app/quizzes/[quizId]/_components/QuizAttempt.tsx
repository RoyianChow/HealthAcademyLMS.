"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitQuizAttempt } from "../action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type QuizAttemptProps = {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number | null;
    timeLimitMinutes: number | null;
    allowMultipleAttempts: boolean;
    questions: {
      id: string;
      question: string;
      explanation: string | null;
      options: {
        id: string;
        text: string;
      }[];
    }[];
  };
  attemptId: string;
  startedAt: string;
  canAttempt: boolean;
  nextAttemptNumber: number;
  previousAttemptsCount: number;
};
type SubmissionResult = {
  status: "success" | "error";
  message: string;
  score?: number;
  totalQuestions?: number;
  passed?: boolean;
  feedback?: string | null;
  gradedAt?: string | null;
  answers?: {
    attemptId?: string;
    questionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    explanation?: string | null;
  }[];
};

export function QuizAttempt({
  quiz,
  attemptId,
  startedAt,
  canAttempt,
  nextAttemptNumber,
  previousAttemptsCount,
}: QuizAttemptProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasAutoSubmittedRef = useRef(false);

  const totalQuestions = quiz.questions.length;

  const answeredCount = useMemo(() => {
    return quiz.questions.filter((question) => selectedAnswers[question.id]).length;
  }, [quiz.questions, selectedAnswers]);

  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  useEffect(() => {
    if (!quiz.timeLimitMinutes || result || !canAttempt) {
      return;
    }

    const startedAtMs = new Date(startedAt).getTime();
    const deadlineMs = startedAtMs + quiz.timeLimitMinutes * 60 * 1000;

    const tick = () => {
      const remainingSeconds = Math.max(
        0,
        Math.floor((deadlineMs - Date.now()) / 1000)
      );

      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        setIsExpired(true);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [quiz.timeLimitMinutes, startedAt, result, canAttempt]);

  useEffect(() => {
    if (!isExpired || result || hasAutoSubmittedRef.current || !canAttempt) {
      return;
    }

    hasAutoSubmittedRef.current = true;

    startTransition(async () => {
      const payload = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionId: selectedAnswers[question.id] ?? null,
      }));

      const response = await submitQuizAttempt({
        quizId: quiz.id,
        attemptId,
        answers: payload,
      });

      if (response.status === "error") {
        toast.error(response.message);
        return;
      }

      setResult(response);
      toast.error("Time is up. Your quiz has been submitted.");
    });
  }, [isExpired, result, canAttempt, quiz, selectedAnswers, attemptId]);

  function handleSelect(questionId: string, optionId: string) {
    if (isPending || result || isExpired) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function handleSubmit(autoSubmit = false) {
    if (!canAttempt) {
      toast.error("You cannot take this quiz again.");
      return;
    }

    if (isExpired && !autoSubmit) {
      toast.error("Time is up. This quiz can no longer be answered.");
      return;
    }

    if (!autoSubmit && !allAnswered) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    startTransition(async () => {
      const payload = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionId: selectedAnswers[question.id] ?? null,
      }));

      const response = await submitQuizAttempt({
        quizId: quiz.id,
        attemptId,
        answers: payload,
      });

      if (response.status === "error") {
        toast.error(response.message);
        return;
      }

      setResult(response);

      if (response.passed) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    });
  }

  if (!canAttempt && !result) {
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Quiz Questions</h2>
          <p className="text-sm text-muted-foreground">
            You have already used your allowed attempt for this quiz.
          </p>
        </div>

        <Card className="rounded-2xl border border-dashed border-border bg-muted/20">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold">No more attempts available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This quiz does not allow multiple attempts.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{quiz.title}</h2>

          {quiz.description ? (
            <p className="text-sm text-muted-foreground">{quiz.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Attempt #{nextAttemptNumber}</Badge>
            <Badge variant="outline">{totalQuestions} questions</Badge>
            {quiz.passingScore !== null ? (
              <Badge variant="outline">Passing score: {quiz.passingScore}%</Badge>
            ) : null}
            {quiz.allowMultipleAttempts ? (
              <Badge variant="outline">Multiple attempts allowed</Badge>
            ) : (
              <Badge variant="outline">Single attempt only</Badge>
            )}
          </div>

          {previousAttemptsCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Previous attempts: {previousAttemptsCount}
            </p>
          ) : null}
        </div>

        {timeLeft !== null && !result ? (
          <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Time remaining</p>
            <p
              className={clsx(
                "text-lg font-semibold tracking-tight",
                timeLeft <= 60 && "text-red-600"
              )}
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        ) : null}
      </div>

      {quiz.questions.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border bg-muted/20">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold">No questions yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This quiz has not been populated with questions yet.
            </p>
          </CardContent>
        </Card>
      ) : result ? (
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={clsx(
                  "rounded-full px-3 py-1",
                  result.passed
                    ? "bg-green-600 text-white hover:bg-green-600"
                    : "bg-red-600 text-white hover:bg-red-600"
                )}
              >
                {result.passed ? "Passed" : "Did not pass"}
              </Badge>

              <Badge variant="secondary">
                Score: {result.score}% ({result.totalQuestions} questions)
              </Badge>
            </div>

            <CardTitle className="text-xl">{result.message}</CardTitle>

            {result.feedback ? (
              <p className="text-sm text-muted-foreground">{result.feedback}</p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-6">
            {quiz.questions.map((question, index) => {
              const answer = result.answers?.find(
                (item) => item.questionId === question.id
              );
              const selectedOptionId = answer?.selectedOptionId ?? null;

              return (
                <div
                  key={question.id}
                  className="rounded-xl border border-border/60 p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Question {index + 1}
                    </Badge>

                    {answer ? (
                      <Badge
                        className={clsx(
                          answer.isCorrect
                            ? "bg-green-600 text-white hover:bg-green-600"
                            : "bg-red-600 text-white hover:bg-red-600"
                        )}
                      >
                        {answer.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="text-base font-semibold leading-relaxed">
                    {question.question}
                  </h3>

                  <div className="mt-4 space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedOptionId === option.id;

                      return (
                        <div
                          key={option.id}
                          className={clsx(
                            "w-full rounded-xl border px-4 py-3 text-left text-sm",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 bg-muted/30"
                          )}
                        >
                          <span className="mr-2 font-medium text-foreground">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          <span className="text-muted-foreground">{option.text}</span>
                        </div>
                      );
                    })}
                  </div>

                 {(answer?.explanation ?? question.explanation) ? (
  <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 p-4">
    <p className="text-sm font-medium">Explanation</p>
    <p className="mt-1 text-sm text-muted-foreground">
      {answer?.explanation ?? question.explanation}
    </p>
  </div>
) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Answered {answeredCount} of {totalQuestions}
            </p>
            {isExpired ? (
              <p className="text-red-600">Time has expired</p>
            ) : !allAnswered ? (
              <p>Please answer all questions before submitting.</p>
            ) : (
              <p>Ready to submit</p>
            )}
          </div>

          {quiz.questions.map((question, index) => (
            <Card
              key={question.id}
              className="rounded-2xl border border-border/60 shadow-sm"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Question {index + 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {question.options.length} option
                    {question.options.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <CardTitle className="text-xl leading-relaxed">
                  {question.question}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {question.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswers[question.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(question.id, option.id)}
                      disabled={isPending || isExpired}
                      className={clsx(
                        "w-full rounded-xl border px-4 py-3 text-left text-sm transition",
                        "hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/60 bg-muted/30"
                      )}
                    >
                      <span className="mr-2 font-medium text-foreground">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      <span className="text-muted-foreground">{option.text}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              className="rounded-full"
              onClick={() => handleSubmit(false)}
              disabled={!allAnswered || isPending || isExpired}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : isExpired ? (
                "Time Expired"
              ) : (
                "Submit Quiz"
              )}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}