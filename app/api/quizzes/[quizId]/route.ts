import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  options: QuizOptionInput[];
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const body = await req.json();

    const { title, description, courseId, questions, isPublished } = body;

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

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    for (const question of questions as QuizQuestionInput[]) {
      if (!question.question?.trim()) {
        return NextResponse.json(
          { error: "Each question must have text" },
          { status: 400 }
        );
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        return NextResponse.json(
          { error: "Each question must have at least 2 options" },
          { status: 400 }
        );
      }

      if (!question.options.some((option) => option.isCorrect)) {
        return NextResponse.json(
          { error: "Each question must have at least one correct option" },
          { status: 400 }
        );
      }

      for (const option of question.options) {
        if (!option.text?.trim()) {
          return NextResponse.json(
            { error: "Each option must have text" },
            { status: 400 }
          );
        }
      }
    }

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: title.trim(),
        description: description?.trim() ? description.trim() : null,
        courseId,
        isPublished: typeof isPublished === "boolean" ? isPublished : false,
      },
    });

    await prisma.quizQuestion.deleteMany({
      where: { quizId },
    });

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        questions: {
          create: (questions as QuizQuestionInput[]).map(
            (question, questionIndex) => ({
              question: question.question.trim(),
              position: questionIndex + 1,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text.trim(),
                  isCorrect: option.isCorrect,
                  position: optionIndex + 1,
                })),
              },
            })
          ),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QUIZ_UPDATE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { title, description, courseId, questions, isPublished } = body;

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

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    for (const question of questions as QuizQuestionInput[]) {
      if (!question.question?.trim()) {
        return NextResponse.json(
          { error: "Each question must have text" },
          { status: 400 }
        );
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        return NextResponse.json(
          { error: "Each question must have at least 2 options" },
          { status: 400 }
        );
      }

      if (!question.options.some((option) => option.isCorrect)) {
        return NextResponse.json(
          { error: "Each question must have at least one correct option" },
          { status: 400 }
        );
      }

      for (const option of question.options) {
        if (!option.text?.trim()) {
          return NextResponse.json(
            { error: "Each option must have text" },
            { status: 400 }
          );
        }
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() ? description.trim() : null,
        courseId,
        isPublished: typeof isPublished === "boolean" ? isPublished : false,
        questions: {
          create: (questions as QuizQuestionInput[]).map(
            (question, questionIndex) => ({
              question: question.question.trim(),
              position: questionIndex + 1,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text.trim(),
                  isCorrect: option.isCorrect,
                  position: optionIndex + 1,
                })),
              },
            })
          ),
        },
      },
    });

    return NextResponse.json({ success: true, quizId: quiz.id });
  } catch (error) {
    console.error("QUIZ_CREATE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}