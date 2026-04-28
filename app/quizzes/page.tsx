import { Suspense } from "react";
import Link from "next/link";

import { EmptyState } from "@/components/general/EmptyState";
import { getEnrolledCourseQuizzes } from "@/app/data/quiz/get-enrolled-course-quizzes";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuizResultDialog } from "./_components/QuizResultDialog";

export const dynamic = "force-dynamic";

export default function QuizzesPage() {
  return (
    <div className="space-y-10 pb-10">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-muted/50 via-background to-muted/30">
        <div className="px-6 py-10 md:px-10 md:py-12">
          <div className="max-w-3xl space-y-4">
            <Badge
              variant="outline"
              className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em]"
            >
              Assessments
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Quizzes
            </h1>

            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              Test your understanding with quizzes connected to your courses and
              reinforce what you’ve learned.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<QuizSkeleton />}>
        <RenderQuizzes />
      </Suspense>
    </div>
  );
}

async function RenderQuizzes() {
  const quizzes = await getEnrolledCourseQuizzes();

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-2">
        <EmptyState
          title="No quizzes available"
          description="Quizzes for your enrolled courses will appear here once they are published."
          buttonText="Browse Courses"
          href="/courses"
        />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Available Quizzes
          </h2>
          <p className="text-sm text-muted-foreground">
            {quizzes.length} quiz{quizzes.length > 1 ? "zes" : ""} available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {quizzes.map((quiz) => {
          const latestAttempt = quiz.attempts?.[0];

          // ✅ safer completion check
          const isCompleted =
            !!latestAttempt &&
            latestAttempt.isComplete === true &&
            latestAttempt.score !== null &&
            latestAttempt.score !== undefined;

          // ✅ safer passed logic
          const passed =
            isCompleted &&
            quiz.passingScore !== null &&
            latestAttempt.score !== null &&
            latestAttempt.score >= quiz.passingScore;

          return (
            <Card
              key={quiz.id}
              className="group rounded-2xl border border-border/60 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant={isCompleted ? "secondary" : "default"}>
                    {isCompleted ? "Completed" : "Available"}
                  </Badge>

                  {quiz.course?.title ? (
                    <span className="text-xs text-muted-foreground">
                      {quiz.course.title}
                    </span>
                  ) : null}
                </div>

                <CardTitle className="text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
                  {quiz.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {quiz.description ?? "No description available for this quiz."}
                </p>

                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Questions</span>
                    <span className="font-medium">
                      {quiz.questions.length} question
                      {quiz.questions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {quiz.timeLimitMinutes !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time Limit</span>
                      <span className="font-medium">
                        {quiz.timeLimitMinutes} min
                      </span>
                    </div>
                  )}

                  {isCompleted ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-semibold">
                          {latestAttempt.score}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Attempt</span>
                        <span className="font-medium">
                          #{latestAttempt.attemptNumber}
                        </span>
                      </div>

                      {quiz.passingScore !== null && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Result</span>
                          <span
                            className={`font-semibold ${
                              passed ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {passed ? "Passed" : "Failed"}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Not attempted yet
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    {isCompleted ? "View your result" : "Ready to start"}
                  </span>

                  {isCompleted ? (
                    <QuizResultDialog quiz={quiz} />
                  ) : (
                    <Link
                      href={`/quizzes/${quiz.id}`}
                      className={buttonVariants({
                        size: "sm",
                        className: "rounded-full",
                      })}
                    >
                      Start Quiz
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function QuizSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[220px] animate-pulse rounded-2xl bg-muted"
        />
      ))}
    </div>
  );
}