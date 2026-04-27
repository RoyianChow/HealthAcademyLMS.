import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, FileQuestion, RotateCcw } from "lucide-react";
import { getQuiz } from "@/app/data/quiz/get-quiz";
import { getOrCreateQuizAttempt } from "@/app/data/quiz/get-or-create-quiz-attempt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuizAttempt } from "./_components/QuizAttempt";
import { QuizBackButton } from "./_components/QuizBackButton";
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
  const previousAttempts = Math.max(0, attempt.attemptNumber - 1);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/20 px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
         <QuizBackButton
  href={`/dashboard/${quiz.course.slug}`}
  label={`Back to ${quiz.course.title}`}
  shouldWarn={canAttempt && quiz.timeLimitMinutes !== null}
/>

          <Badge variant={canAttempt ? "default" : "secondary"}>
            {canAttempt ? "Available" : "Attempt Locked"}
          </Badge>
        </div>

        <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
          <div className="border-b bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    Assessment
                  </Badge>

                  {quiz.chapter ? (
                    <Badge variant="secondary" className="rounded-full">
                      Chapter {quiz.chapter.position}: {quiz.chapter.title}
                    </Badge>
                  ) : null}

                  <Badge variant="outline" className="rounded-full">
                    {quiz.allowMultipleAttempts
                      ? "Multiple attempts"
                      : "Single attempt"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                    {quiz.title}
                  </h1>

                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    {quiz.description ??
                      "Complete this quiz to check your understanding before moving forward in the course."}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
                <InfoCard
                  icon={<FileQuestion className="size-5" />}
                  label="Questions"
                  value={String(totalQuestions)}
                />

                <InfoCard
                  icon={<Clock3 className="size-5" />}
                  label="Time Limit"
                  value={
                    quiz.timeLimitMinutes !== null
                      ? `${quiz.timeLimitMinutes} min`
                      : "No limit"
                  }
                />

                <InfoCard
                  icon={<CheckCircle2 className="size-5" />}
                  label="Passing Score"
                  value={
                    quiz.passingScore !== null
                      ? `${quiz.passingScore}%`
                      : "Not set"
                  }
                />

                <InfoCard
                  icon={<RotateCcw className="size-5" />}
                  label="Attempt"
                  value={`#${attempt.attemptNumber}`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-1">
              <p className="font-medium">
                {canAttempt
                  ? "Ready to start your quiz"
                  : "You have already completed this quiz"}
              </p>
              <p className="text-sm text-muted-foreground">
                {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} ·
                Choose the best answer for each question · Previous attempts:{" "}
                {previousAttempts}
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/quizzes">View All Quizzes</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border bg-background p-4 shadow-sm md:p-6">
          <QuizAttempt
            quiz={quiz}
            attemptId={attempt.attemptId ?? ""}
            startedAt={attempt.startedAt ? attempt.startedAt.toISOString() : ""}
            canAttempt={canAttempt}
            nextAttemptNumber={attempt.attemptNumber}
            previousAttemptsCount={previousAttempts}
          />
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}