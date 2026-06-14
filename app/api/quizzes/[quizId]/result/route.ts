import { NextResponse } from "next/server";
import { getQuizResultDetails } from "@/app/data/quiz/get-enrolled-course-quizzes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    quizId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const quiz = await getQuizResultDetails(quizId);

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load quiz result.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
