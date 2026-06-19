"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitQuizAttempt } from "../action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import clsx from "clsx";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { QuestionType } from "@/lib/question-type";

export type SubmissionResult = {
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
    selectedOptionIds?: string[];
    textResponse?: string | null;
    isCorrect: boolean;
    explanation?: string | null;
  }[];
};

type QuizQuestionView = {
  id: string;
  question: string;
  explanation: string | null;
  questionType: QuestionType;
  options: {
    id: string;
    text: string;
  }[];
};

type QuizAttemptProps = {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number | null;
    timeLimitMinutes: number | null;
    allowMultipleAttempts: boolean;
    questions: QuizQuestionView[];
  };
  attemptId: string | null;
  startedAt: string | null;
  canAttempt: boolean;
  nextAttemptNumber: number;
  lastResult?: SubmissionResult | null;
};

function isQuestionAnswered(
  question: QuizQuestionView,
  selectedAnswers: Record<string, string>,
  multiSelectedAnswers: Record<string, Set<string>>,
  textAnswers: Record<string, string>
): boolean {
  switch (question.questionType) {
    case QuestionType.multiple:
      return (multiSelectedAnswers[question.id]?.size ?? 0) > 0;
    case QuestionType.essay:
      return Boolean(textAnswers[question.id]?.trim());
    case QuestionType.assessment:
    case QuestionType.single:
    default:
      return Boolean(selectedAnswers[question.id]);
  }
}

function buildSubmitPayload(
  questions: QuizQuestionView[],
  selectedAnswers: Record<string, string>,
  multiSelectedAnswers: Record<string, Set<string>>,
  textAnswers: Record<string, string>
) {
  return questions.map((question) => {
    switch (question.questionType) {
      case QuestionType.multiple:
        return {
          questionId: question.id,
          selectedOptionIds: [...(multiSelectedAnswers[question.id] ?? [])],
        };
      case QuestionType.essay:
        return {
          questionId: question.id,
          textResponse: textAnswers[question.id] ?? "",
        };
      case QuestionType.assessment:
      case QuestionType.single:
      default:
        return {
          questionId: question.id,
          selectedOptionId: selectedAnswers[question.id] ?? null,
        };
    }
  });
}

export function QuizAttempt({
  quiz,
  attemptId,
  startedAt,
  canAttempt,
  nextAttemptNumber,
  lastResult,
}: QuizAttemptProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [multiSelectedAnswers, setMultiSelectedAnswers] = useState<
    Record<string, Set<string>>
  >({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(lastResult || null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (attemptId) {
      setResult(null);
    }
  }, [attemptId]);

  const totalQuestions = quiz.questions.length;

  const answeredCount = useMemo(() => {
    return quiz.questions.filter((question) =>
      isQuestionAnswered(
        question,
        selectedAnswers,
        multiSelectedAnswers,
        textAnswers
      )
    ).length;
  }, [quiz.questions, selectedAnswers, multiSelectedAnswers, textAnswers]);

  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  useEffect(() => {
    if (!quiz.timeLimitMinutes || result || !canAttempt || !startedAt) {
      return;
    }

    const startedAtMs = new Date(startedAt).getTime();
    const deadlineMs = startedAtMs + quiz.timeLimitMinutes * 60 * 1000;

    const tick = () => {
      const remainingSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
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
    if (!isExpired || result || hasAutoSubmittedRef.current || !canAttempt || !attemptId) {
      return;
    }

    hasAutoSubmittedRef.current = true;

    startTransition(async () => {
      const payload = buildSubmitPayload(
        quiz.questions,
        selectedAnswers,
        multiSelectedAnswers,
        textAnswers
      );

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
  }, [
    isExpired,
    result,
    canAttempt,
    quiz,
    selectedAnswers,
    multiSelectedAnswers,
    textAnswers,
    attemptId,
  ]);

  function handleSelect(questionId: string, optionId: string) {
    if (isPending || result || isExpired) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleMultiSelect(questionId: string, optionId: string) {
    if (isPending || result || isExpired) return;

    setMultiSelectedAnswers((prev) => {
      const current = new Set(prev[questionId] ?? []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
      return { ...prev, [questionId]: current };
    });
  }

  function handleTextChange(questionId: string, value: string) {
    if (isPending || result || isExpired) return;
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function handleSubmit(autoSubmit = false) {
    if (!canAttempt || !attemptId) {
      toast.error("You cannot take this quiz right now.");
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
      const payload = buildSubmitPayload(
        quiz.questions,
        selectedAnswers,
        multiSelectedAnswers,
        textAnswers
      );

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

  function renderQuestionBadge(question: QuizQuestionView) {
    switch (question.questionType) {
      case QuestionType.multiple:
        return <Badge variant="outline">Multiple choice</Badge>;
      case QuestionType.essay:
        return <Badge variant="outline">Essay</Badge>;
      case QuestionType.assessment:
        return <Badge variant="outline">Self-assessment</Badge>;
      default:
        return null;
    }
  }

  function renderResultQuestion(question: QuizQuestionView, index: number) {
    const answer = result?.answers?.find((item) => item.questionId === question.id);
    const selectedOptionId = answer?.selectedOptionId ?? null;
    const selectedOptionIds = new Set(answer?.selectedOptionIds ?? []);
    const textResponse = answer?.textResponse ?? null;

    const showGradedBadge =
      question.questionType === QuestionType.single ||
      question.questionType === QuestionType.multiple;

    return (
      <div key={question.id} className="rounded-xl border border-border/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Question {index + 1}
          </Badge>
          {renderQuestionBadge(question)}
          {showGradedBadge && answer ? (
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
          {question.questionType === QuestionType.essay && textResponse ? (
            <Badge variant="outline">Response submitted</Badge>
          ) : null}
          {question.questionType === QuestionType.assessment && selectedOptionId ? (
            <Badge variant="outline">Response recorded</Badge>
          ) : null}
        </div>

        <h3 className="text-base font-semibold leading-relaxed">{question.question}</h3>

        {question.questionType === QuestionType.essay ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            {textResponse || "No response submitted."}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {question.options.map((option, optionIndex) => {
              const isSelected =
                question.questionType === QuestionType.multiple
                  ? selectedOptionIds.has(option.id)
                  : selectedOptionId === option.id;

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
        )}

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
  }

  function renderActiveQuestion(question: QuizQuestionView, index: number) {
    return (
      <Card
        key={question.id}
        className="rounded-2xl border border-border/60 shadow-sm"
      >
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Question {index + 1}
            </Badge>
            {renderQuestionBadge(question)}
            {question.questionType !== QuestionType.essay ? (
              <span className="text-xs text-muted-foreground">
                {question.options.length} option
                {question.options.length !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          <CardTitle className="text-xl leading-relaxed">{question.question}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {question.questionType === QuestionType.essay ? (
            <Textarea
              placeholder="Write your answer here..."
              value={textAnswers[question.id] ?? ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              disabled={isPending || isExpired}
              rows={6}
            />
          ) : question.questionType === QuestionType.multiple ? (
            question.options.map((option, optionIndex) => {
              const isSelected = multiSelectedAnswers[question.id]?.has(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleMultiSelect(question.id, option.id)}
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
            })
          ) : (
            question.options.map((option, optionIndex) => {
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
                  {question.questionType === QuestionType.assessment ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Self-assessment — no right answer
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    );
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

  if (canAttempt && !attemptId && !result) {
    return (
      <section className="space-y-6">
        <Card className="rounded-2xl border border-dashed border-border bg-muted/20">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold">Ready to begin?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Click the Start Quiz button in the header above to begin your attempt.
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
                {result.passed ? "Passed" : "Failed"}
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
            {quiz.questions.map((question, index) =>
              renderResultQuestion(question, index)
            )}
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

          {quiz.questions.map((question, index) =>
            renderActiveQuestion(question, index)
          )}

          <div className="flex justify-end">
            <Button
              className="rounded-full"
              onClick={() => handleSubmit(false)}
              disabled={!allAnswered || isPending || isExpired}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Quiz
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
