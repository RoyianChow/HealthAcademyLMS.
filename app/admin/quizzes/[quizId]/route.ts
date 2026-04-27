import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

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

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      quizId: string;
    }>;
  }
) {
  try {
    const { quizId } = await context.params;
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

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Quiz title is required" },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    if (!chapterId) {
      return NextResponse.json(
        { error: "Chapter is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Selected chapter does not belong to this course" },
        { status: 400 }
      );
    }

    for (const question of questions) {
      if (!question.question.trim()) {
        return NextResponse.json(
          { error: "Each question must have text" },
          { status: 400 }
        );
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        return NextResponse.json(
          { error: "Each question must have at least two options" },
          { status: 400 }
        );
      }

      if (question.options.some((option) => !option.text.trim())) {
        return NextResponse.json(
          { error: "Each option must have text" },
          { status: 400 }
        );
      }

      if (!question.options.some((option) => option.isCorrect)) {
        return NextResponse.json(
          { error: "Each question needs at least one correct option" },
          { status: 400 }
        );
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
      success: true,
      message: "Quiz updated successfully",
    });
  } catch (error) {
    console.error("QUIZ_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        error: "Failed to update quiz",
      },
      {
        status: 500,
      }
    );
  }
}