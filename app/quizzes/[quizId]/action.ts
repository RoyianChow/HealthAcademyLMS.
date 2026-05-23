"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";

type SubmitQuizAttemptInput = {
  quizId: string;
  attemptId: string;
  answers: {
    questionId: string;
    selectedOptionId: string | null;
  }[];
};

export async function startQuizAttempt(quizId: string, attemptNumber: number) {
  try {
    const user = await requireUser();

    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        userId: user.id,
        isComplete: false,
      },
    });

    if (existingAttempt) {
      return existingAttempt;
    }

    const newAttempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.id,
        attemptNumber,
        isComplete: false,
        isGraded: false,
      },
    });

    revalidatePath(`/quizzes/${quizId}`);
    return newAttempt;
  } catch (error) {
    console.error("startQuizAttempt error", error);
    throw new Error("Failed to start quiz attempt.");
  }
}

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

    if (quiz.questions.length === 0) {
      return {
        status: "error" as const,
        message: "This quiz has no questions.",
      };
    }

    if (quiz.timeLimitMinutes !== null) {
      // 15-second network latency grace period for slow connections or temporary client issues
      const deadline = new Date(
        attempt.createdAt.getTime() + (quiz.timeLimitMinutes * 60 * 1000) + 15000
      );

      if (new Date() > deadline) {
        await prisma.$transaction([
          prisma.quizAnswer.deleteMany({
            where: { attemptId: attempt.id },
          }),
          prisma.quizAttempt.update({
            where: { id: attempt.id },
            data: {
              isComplete: true,
              isGraded: true,
              submittedAt: new Date(),
              gradedAt: new Date(),
              score: 0,
            },
          }),
        ]);

        revalidatePath(`/quizzes/${quiz.id}`);
        revalidatePath("/quizzes");
        revalidatePath("/dashboard");

        return {
          status: "success" as const,
          message: "Time limit severely exceeded. This attempt has expired.",
          score: 0,
          totalQuestions: quiz.questions.length,
          passed: false,
          answers: [],
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

    const submittedAnswerMap = new Map(
      input.answers.map((answer) => [
        answer.questionId,
        answer.selectedOptionId,
      ])
    );

    const answerRows = quiz.questions.map((question) => {
      const selectedOptionId = submittedAnswerMap.get(question.id) ?? null;

      if (selectedOptionId) {
        const selectedOption = optionMap.get(selectedOptionId);

        if (!selectedOption || selectedOption.questionId !== question.id) {
          throw new Error("Invalid selected option.");
        }
      }

      const selectedOption = selectedOptionId
        ? optionMap.get(selectedOptionId)
        : null;

      return {
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionId,
        isCorrect: selectedOption?.isCorrect ?? false,
      };
    });

    const correctCount = answerRows.filter((answer) => answer.isCorrect).length;

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passingScore = quiz.passingScore ?? 0;
    const passed = score >= passingScore;

    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({
        where: {
          attemptId: attempt.id,
        },
      }),

      prisma.quizAnswer.createMany({
        data: answerRows,
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
    rethrowIfNextRedirect(error);
    console.error("submitQuizAttempt error", error);

    return {
      status: "error" as const,
      message: "Something went wrong while submitting the quiz.",
    };
  }
}
