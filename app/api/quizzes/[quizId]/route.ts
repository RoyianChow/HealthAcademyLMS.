import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import {
  normalizeQuizQuestionType,
  validateQuizQuestions,
  type QuizQuestionInput,
} from "@/lib/quiz-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    quizId: string;
  }>;
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
  await requireAdmin();

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

    const validationError = validateQuizQuestions(questions);
    if (validationError) {
      return apiError(validationError);
    }

    await prisma.$transaction(async (tx) => {
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
        },
      });

      const existingQuestions = await tx.quizQuestion.findMany({
        where: { quizId },
        select: { id: true },
        orderBy: { position: "asc" },
      });

      if (existingQuestions.length === questions.length) {
        for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
          const question = questions[questionIndex];
          const existingQuestion = existingQuestions[questionIndex];

          await tx.quizOption.deleteMany({
            where: { questionId: existingQuestion.id },
          });

          await tx.quizQuestion.update({
            where: { id: existingQuestion.id },
            data: {
              question: question.question.trim(),
              explanation: question.explanation?.trim() || null,
              questionType: normalizeQuizQuestionType(question.questionType),
              position: questionIndex + 1,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text.trim(),
                  isCorrect: Boolean(option.isCorrect),
                  position: optionIndex + 1,
                })),
              },
            },
          });
        }

        return;
      }

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
          questions: {
            create: questions.map((question, questionIndex) => ({
              question: question.question.trim(),
              explanation: question.explanation?.trim() || null,
              questionType: normalizeQuizQuestionType(question.questionType),
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
