import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    quizId: string;
  }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const body = await req.json();

    const { title, description, courseId, questions } = body;

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description: description || null,
        courseId,
      },
    });

    await prisma.quizQuestion.deleteMany({
      where: { quizId },
    });

    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        questions: {
          create: questions.map(
            (
              question: {
                question: string;
                options: { text: string; isCorrect: boolean }[];
              },
              questionIndex: number
            ) => ({
              question: question.question,
              position: questionIndex + 1,
              options: {
                create: question.options.map(
                  (
                    option: { text: string; isCorrect: boolean },
                    optionIndex: number
                  ) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                    position: optionIndex + 1,
                  })
                ),
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