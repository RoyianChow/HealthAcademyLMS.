import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    quizId: string;
  }>;
};

type QuizOptionInput = {
  text: string;
  isCorrect: boolean;
};

type QuizQuestionInput = {
  question: string;
  explanation?: string | null;
  options: QuizOptionInput[];
};

type QuizUpdateBody = {
  title?: string;
  description?: string | null;
  courseId?: string;
  chapterId?: string;
  isPublished?: boolean;
  passingScore?: number | null;
  timeLimitMinutes?: number | null;
  allowMultipleAttempts?: boolean;
  questions?: QuizQuestionInput[];
};

function apiError(message: string, status = 400) {
  return NextResponse.json(
    {
      status: "error",
      message,
    },
    { status }
  );
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const body = (await req.json()) as QuizUpdateBody;

    const {
      title,
      description,
      courseId,
      chapterId,
      isPublished,
      passingScore,
      timeLimitMinutes,
      allowMultipleAttempts,
      questions,
    } = body;

    if (!quizId) {
      return apiError("Quiz ID is required");
    }

    if (!title?.trim()) {
      return apiError("Quiz title is required");
    }

    if (!courseId) {
      return apiError("Course is required");
    }

    if (!chapterId) {
      return apiError("Chapter is required");
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return apiError("At least one question is required");
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        courseId,
      },
      select: {
        id: true,
      },
    });

    if (!chapter) {
      return apiError("Selected chapter does not belong to this course");
    }

    for (const question of questions) {
      if (!question.question.trim()) {
        return apiError("Each question must have text");
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        return apiError("Each question must have at least two options");
      }

      const hasEmptyOption = question.options.some(
        (option) => !option.text.trim()
      );

      if (hasEmptyOption) {
        return apiError("Each option must have text");
      }

      const hasCorrectOption = question.options.some(
        (option) => option.isCorrect
      );

      if (!hasCorrectOption) {
        return apiError("Each question needs at least one correct option");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({
        where: {
          quizId,
        },
      });

      await tx.quiz.update({
        where: {
          id: quizId,
        },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          courseId,
          chapterId,
          isPublished: Boolean(isPublished),
          passingScore: passingScore ?? null,
          timeLimitMinutes: timeLimitMinutes ?? null,
          allowMultipleAttempts: Boolean(allowMultipleAttempts),
          questions: {
            create: questions.map((question, questionIndex) => ({
              question: question.question.trim(),
              explanation: question.explanation?.trim() || null,
              position: questionIndex + 1,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text.trim(),
                  isCorrect: Boolean(option.isCorrect),
                  position: optionIndex + 1,
                })),
              },
            })),
          },
        },
      });
    });

    return NextResponse.json({
      status: "success",
      message: "Quiz updated successfully",
    });
  } catch (error) {
    console.error("QUIZ_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update quiz",
      },
      { status: 500 }
    );
  }
}