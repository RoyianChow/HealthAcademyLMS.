"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuizQuestion, type Option } from "./QuizQuestion";

type ChapterOption = {
  id: string;
  title: string;
};

type CourseOption = {
  id: string;
  title: string;
  chapters?: ChapterOption[];
};

type QuizFormData = {
  id: string;
  title: string;
  description: string | null;
  courseId: string | null;
  chapterId: string | null;
  isPublished?: boolean;
  passingScore?: number | null;
  timeLimitMinutes?: number | null;
  allowMultipleAttempts?: boolean;
  courses?: CourseOption[];
  questions?: {
    id: string;
    question: string;
    explanation?: string | null;
    options: Option[];
  }[];
};

type QuizFormProps = {
  mode: "create" | "edit";
  initialData: QuizFormData | null;
};

export type QuizQuestionItem = {
  id: string;
  question: string;
  explanation: string;
  options: Option[];
  isSaved?: boolean;
};

function createEmptyQuestion(): QuizQuestionItem {
  return {
    id: crypto.randomUUID(),
    question: "",
    explanation: "",
    options: [
      { id: crypto.randomUUID(), text: "", isCorrect: false },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
    ],
    isSaved: false,
  };
}

export function QuizForm({ mode, initialData }: QuizFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [courseId, setCourseId] = useState(initialData?.courseId ?? "");
  const [chapterId, setChapterId] = useState(initialData?.chapterId ?? "");

  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished ?? false
  );

  const [passingScore, setPassingScore] = useState<string>(
    initialData?.passingScore?.toString() ?? ""
  );

  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>(
    initialData?.timeLimitMinutes?.toString() ?? ""
  );

  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(
    initialData?.allowMultipleAttempts ?? false
  );

  const [questions, setQuestions] = useState<QuizQuestionItem[]>(() => {
    if (initialData?.questions?.length) {
      return initialData.questions.map((question) => ({
        id: question.id,
        question: question.question,
        explanation: question.explanation ?? "",
        options: question.options,
        isSaved: true,
      }));
    }

    return [createEmptyQuestion()];
  });

  const courses = useMemo(() => initialData?.courses ?? [], [initialData]);

  const chapters = useMemo(() => {
    return courses.find((course) => course.id === courseId)?.chapters ?? [];
  }, [courses, courseId]);

  const isEditMode = mode === "edit";

  function handleCourseChange(value: string) {
    setCourseId(value);
    setChapterId("");
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => {
      if (prev.length === 1) {
        toast.error("A quiz must have at least one question");
        return prev;
      }

      return prev.filter((question) => question.id !== id);
    });
  }

  function updateQuestion(
    id: string,
    updatedQuestion: {
      question: string;
      explanation: string;
      options: Option[];
    }
  ) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id
          ? {
              ...question,
              ...updatedQuestion,
              isSaved: false,
            }
          : question
      )
    );
  }

  function handleQuestionChange(
    index: number,
    updatedQuestion: {
      question: string;
      explanation: string;
      options: Option[];
    }
  ) {
    const question = questions[index];
    if (!question) return;

    updateQuestion(question.id, updatedQuestion);
  }

  function handleSaveQuestion(
    index: number,
    savedQuestion: {
      question: string;
      explanation: string;
      options: Option[];
    }
  ) {
    const hasEmptyQuestion = !savedQuestion.question.trim();
    const hasEmptyOption = savedQuestion.options.some(
      (option) => !option.text.trim()
    );
    const hasCorrectAnswer = savedQuestion.options.some(
      (option) => option.isCorrect
    );

    if (hasEmptyQuestion) {
      toast.error(`Question ${index + 1} needs a question text`);
      return;
    }

    if (hasEmptyOption) {
      toast.error(`Question ${index + 1} has an empty option`);
      return;
    }

    if (!hasCorrectAnswer) {
      toast.error(`Question ${index + 1} needs at least one correct answer`);
      return;
    }

    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              question: savedQuestion.question,
              explanation: savedQuestion.explanation,
              options: savedQuestion.options,
              isSaved: true,
            }
          : question
      )
    );

    toast.success(`Question ${index + 1} saved`);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Quiz title is required");
      return;
    }

    if (!courseId) {
      toast.error("Please select a course");
      return;
    }

    if (!chapterId) {
      toast.error("Please select a chapter");
      return;
    }

    const parsedPassingScore =
      passingScore.trim() === "" ? null : Number(passingScore);

    const parsedTimeLimitMinutes =
      timeLimitMinutes.trim() === "" ? null : Number(timeLimitMinutes);

    if (
      parsedPassingScore !== null &&
      (!Number.isInteger(parsedPassingScore) ||
        parsedPassingScore < 0 ||
        parsedPassingScore > 100)
    ) {
      toast.error("Passing score must be a whole number between 0 and 100");
      return;
    }

    if (
      parsedTimeLimitMinutes !== null &&
      (!Number.isInteger(parsedTimeLimitMinutes) || parsedTimeLimitMinutes <= 0)
    ) {
      toast.error("Time limit must be a whole number greater than 0");
      return;
    }

    const hasIncompleteQuestion = questions.some(
      (question) =>
        !question.question.trim() ||
        question.options.some((option) => !option.text.trim()) ||
        !question.options.some((option) => option.isCorrect)
    );

    if (hasIncompleteQuestion) {
      toast.error("Fix all questions before submitting");
      return;
    }

    const endpoint = isEditMode
      ? `/api/quizzes/${initialData?.id}`
      : "/api/quizzes";

    const method = isEditMode ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const res = await fetch(endpoint, {
          method,
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            courseId,
            chapterId,
            isPublished,
            passingScore: parsedPassingScore,
            timeLimitMinutes: parsedTimeLimitMinutes,
            allowMultipleAttempts,
            questions: questions.map((question) => ({
              id: question.id,
              question: question.question.trim(),
              explanation: question.explanation.trim() || null,
              options: question.options.map((option) => ({
                id: option.id,
                text: option.text.trim(),
                isCorrect: option.isCorrect,
              })),
            })),
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to save quiz");
        }

        toast.success(
          isEditMode ? "Quiz updated successfully" : "Quiz created successfully"
        );

        router.push("/admin/quizzes");
        router.refresh();
      } catch (error) {
        console.error("QUIZ_SUBMIT_ERROR", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to save quiz"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Quiz Details" : "New Quiz"}</CardTitle>
        <CardDescription>
          {isEditMode
            ? "Edit the quiz information below."
            : "Fill in the quiz information below."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="title">Quiz Title</Label>
            <Input
              id="title"
              placeholder="e.g. Advanced Nutrition Quiz 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Write a short description for this quiz"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={5}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="courseId">Connect to Course</Label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={isPending}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chapterId">Connect to Chapter</Label>
              <select
                id="chapterId"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={isPending || !courseId}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">
                  {courseId ? "Select a chapter" : "Select a course first"}
                </option>

                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="e.g. 70"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeLimitMinutes">Time Limit (minutes)</Label>
              <Input
                id="timeLimitMinutes"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 30"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Quiz Status</Label>
            <select
              id="status"
              value={String(isPublished)}
              onChange={(e) => setIsPublished(e.target.value === "true")}
              disabled={isPending}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="false">Draft</option>
              <option value="true">Published</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="allowMultipleAttempts">Attempt Rules</Label>
            <select
              id="allowMultipleAttempts"
              value={String(allowMultipleAttempts)}
              onChange={(e) =>
                setAllowMultipleAttempts(e.target.value === "true")
              }
              disabled={isPending}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="false">Single attempt only</option>
              <option value="true">Allow multiple attempts</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  Quiz Questions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add and manage the questions for this quiz.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                disabled={isPending}
              >
                <Plus className="mr-2 size-4" />
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium">
                        Question {index + 1}
                      </h3>

                      {question.isSaved ? (
                        <span className="text-xs font-medium text-green-600">
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">
                          Unsaved
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove
                    </Button>
                  </div>

                  <QuizQuestion
                    questionIndex={index}
                    value={question}
                    onChange={(updatedQuestion) =>
                      handleQuestionChange(index, updatedQuestion)
                    }
                    onSave={(savedQuestion) =>
                      handleSaveQuestion(index, savedQuestion)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{isEditMode ? "Saving..." : "Creating..."}</span>
                </>
              ) : (
                <span>{isEditMode ? "Save Changes" : "Create Quiz"}</span>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}