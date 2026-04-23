"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";

type SubmitQuizAttemptInput = {
  quizId: string;
  attemptId: string;
  answers: {
    questionId: string;
    selectedOptionId: string | null;
  }[];
};

export async function submitQuizAttempt(input: SubmitQuizAttemptInput) {
  try {
    const user = await requireUser();

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: input.attemptId,
        quizId: input.quizId,
        userId: user.id,
        isComplete: false,
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: {
                position: "asc",
              },
              include: {
                options: {
                  orderBy: {
                    position: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return {
        status: "error" as const,
        message: "Attempt not found or already submitted.",
      };
    }

    const quiz = attempt.quiz;

    if (quiz.timeLimitMinutes !== null) {
      const deadline = new Date(
        attempt.createdAt.getTime() + quiz.timeLimitMinutes * 60 * 1000
      );

      if (new Date() > deadline) {
        await prisma.quizAttempt.update({
          where: {
            id: attempt.id,
          },
          data: {
            isComplete: true,
            isGraded: true,
            submittedAt: deadline,
            gradedAt: new Date(),
            score: 0,
          },
        });

        return {
          status: "error" as const,
          message: "Time is up. This attempt has expired.",
        };
      }
    }

    const questionIds = new Set(quiz.questions.map((question) => question.id));

    const hasInvalidQuestionId = input.answers.some(
      (answer) => !questionIds.has(answer.questionId)
    );

    if (hasInvalidQuestionId) {
      return {
        status: "error" as const,
        message: "Some submitted answers are invalid.",
      };
    }

    const normalizedAnswers = quiz.questions.map((question) => {
      const submitted = input.answers.find(
        (answer) => answer.questionId === question.id
      );

      return {
        questionId: question.id,
        selectedOptionId: submitted?.selectedOptionId ?? null,
      };
    });

    const optionMap = new Map<
      string,
      { questionId: string; isCorrect: boolean }
    >();

    quiz.questions.forEach((question) => {
      question.options.forEach((option) => {
        optionMap.set(option.id, {
          questionId: question.id,
          isCorrect: option.isCorrect,
        });
      });
    });

    for (const answer of normalizedAnswers) {
      if (!answer.selectedOptionId) continue;

      const option = optionMap.get(answer.selectedOptionId);

      if (!option || option.questionId !== answer.questionId) {
        return {
          status: "error" as const,
          message: "One or more selected options are invalid.",
        };
      }
    }

    let correctCount = 0;

    const answerRows = normalizedAnswers.map((answer) => {
      const selectedOption = answer.selectedOptionId
        ? optionMap.get(answer.selectedOptionId)
        : null;

      const isCorrect = selectedOption?.isCorrect ?? false;

      if (isCorrect) {
        correctCount++;
      }

      const question = quiz.questions.find((item) => item.id === answer.questionId)!;

      return {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passingScore = quiz.passingScore ?? 0;
    const passed = score >= passingScore;

    await prisma.$transaction([
      prisma.quizAnswer.createMany({
        data: answerRows.map((answer) => ({
          attemptId: attempt.id,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          isCorrect: answer.isCorrect,
        })),
      }),
      prisma.quizAttempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          isComplete: true,
          isGraded: true,
          score,
          submittedAt: new Date(),
          gradedAt: new Date(),
        },
      }),
    ]);

    revalidatePath(`/quizzes/${quiz.id}`);
    revalidatePath("/quizzes");
    revalidatePath("/dashboard");

    return {
      status: "success" as const,
      message: passed
        ? "Quiz submitted successfully. You passed."
        : "Quiz submitted successfully.",
      score,
      totalQuestions: quiz.questions.length,
      passed,
      answers: answerRows,
    };
  } catch (error) {
    console.error("submitQuizAttempt error", error);

    return {
      status: "error" as const,
      message: "Something went wrong while submitting the quiz.",
    };
  }
}