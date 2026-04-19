"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type QuizAttemptProps = {
  quiz: {
    id: string;
    title: string;
    description: string | null;
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
};

export function QuizAttempt({ quiz }: QuizAttemptProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  function handleSelect(questionId: string, optionId: string) {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Quiz Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          Select one answer for each question.
        </p>
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
      ) : (
        <div className="space-y-6">
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
                  const isSelected =
                    selectedAnswers[question.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(question.id, option.id)}
                      className={clsx(
                        "w-full rounded-xl border px-4 py-3 text-left text-sm transition",
                        "hover:border-primary/50 hover:bg-muted/50",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/60 bg-muted/30"
                      )}
                    >
                      <span className="mr-2 font-medium text-foreground">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      <span className="text-muted-foreground">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button className="rounded-full">Submit Quiz</Button>
          </div>
        </div>
      )}
    </section>
  );
}   