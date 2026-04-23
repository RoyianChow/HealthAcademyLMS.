import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuiz } from "@/app/data/quiz/get-quiz";
import { getOrCreateQuizAttempt } from "@/app/data/quiz/get-or-create-quiz-attempt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { QuizAttempt } from "./_components/QuizAttempt";

type PageProps = {
  params: Promise<{
    quizId: string;
  }>;
};

export default async function QuizDetailsPage({ params }: PageProps) {
  const { quizId } = await params;

  const [quiz, attempt] = await Promise.all([
    getQuiz(quizId),
    getOrCreateQuizAttempt(quizId),
  ]);

  if (!quiz || !attempt) {
    notFound();
  }

  const totalQuestions = quiz.questions.length;
  const canAttempt = !attempt.blocked;

  return (
    <div className="w-full space-y-6 pb-12">
      <section className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="w-full px-6 py-8 md:px-8 md:py-10 xl:px-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="rounded-full border-border px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-foreground"
                >
                  Assessment
                </Badge>

                {quiz.course?.title ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-4 py-1.5"
                  >
                    {quiz.course.title}
                  </Badge>
                ) : null}

                {quiz.passingScore !== null ? (
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-1.5"
                  >
                    Pass: {quiz.passingScore}%
                  </Badge>
                ) : null}

                {quiz.allowMultipleAttempts ? (
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-1.5"
                  >
                    Multiple Attempts
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-1.5"
                  >
                    Single Attempt
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {quiz.title}
                </h1>

                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {quiz.description ??
                    "Test your understanding and strengthen your learning with this quiz."}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 xl:max-w-[720px]">
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Questions
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {totalQuestions}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Format
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  Multiple Choice
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Time Limit
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {quiz.timeLimitMinutes !== null
                    ? `${quiz.timeLimitMinutes} min`
                    : "No limit"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span>
                {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
              </span>
              <span>Choose one answer per question</span>
              <span>Attempt #{attempt.attemptNumber}</span>
              <span>
                Previous attempts: {Math.max(0, attempt.attemptNumber - 1)}
              </span>
              {!canAttempt ? <span>No more attempts available</span> : null}
            </div>

            <Link
              href="/quizzes"
              className={buttonVariants({
                variant: "outline",
                className: "rounded-full px-5",
              })}
            >
              Back to Quizzes
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
        <QuizAttempt
          quiz={quiz}
          attemptId={attempt.attemptId ?? ""}
          startedAt={attempt.startedAt ? attempt.startedAt.toISOString() : ""}
          canAttempt={canAttempt}
          nextAttemptNumber={attempt.attemptNumber}
          previousAttemptsCount={Math.max(0, attempt.attemptNumber)}
        />
      </section>
    </div>
  );
}