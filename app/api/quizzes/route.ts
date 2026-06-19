import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/app/data/admin/require-admin";
import {
  normalizeQuizQuestionType,
  validateQuizQuestions,
  type QuizQuestionInput,
} from "@/lib/quiz-validation";

export async function POST(req: Request) {
  await requireAdmin();

  try {
    const body = await req.json();

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
      return NextResponse.json(
        { error: "Course is required" },
        { status: 400 }
      );
    }

    if (!chapterId) {
      return NextResponse.json(
        { error: "Chapter is required" },
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

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    const validationError = validateQuizQuestions(questions as QuizQuestionInput[]);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
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
          create: (questions as QuizQuestionInput[]).map(
            (question, questionIndex) => ({
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
            })
          ),
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    console.error("QUIZ_CREATE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}
