"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/app/data/user/require-user";
import { revalidatePath } from "next/cache";
import { rethrowIfNextRedirect } from "@/lib/rethrow-next-redirect";
import { QuestionType } from "@/lib/question-type";

type AnswerInput = {
  questionId: string;
  selectedOptionId?: string | null;
  selectedOptionIds?: string[];
  textResponse?: string;
};

type SubmitQuizAttemptInput = {
  quizId: string;
  attemptId: string;
  answers: AnswerInput[];
};

function isGradableQuestionType(questionType: QuestionType): boolean {
  return (
    questionType !== QuestionType.assessment &&
    questionType !== QuestionType.essay
  );
}

function gradeMultipleChoice(
  correctOptionIds: Set<string>,
  selectedOptionIds: string[]
): boolean {
  const selectedIds = new Set(selectedOptionIds);
  if (correctOptionIds.size === 0) return false;

  return (
    [...correctOptionIds].every((id) => selectedIds.has(id)) &&
    [...selectedIds].every((id) => correctOptionIds.has(id))
  );
}

export async function getLastQuizResult(
  quizId: string,
  passingScore: number | null,
  totalQuestions: number
) {
  try {
    const user = await requireUser();

    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        userId: user.id,
        isComplete: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        answers: {
          include: {
            selections: {
              select: {
                optionId: true,
              },
            },
          },
        },
      },
    });

    if (!lastAttempt) return null;

    return {
      status: "success" as const,
      message:
        (lastAttempt.score ?? 0) >= (passingScore ?? 0)
          ? "Quiz submitted successfully. You passed."
          : "Quiz submitted successfully.",
      score: lastAttempt.score ?? 0,
      totalQuestions,
      passed: (lastAttempt.score ?? 0) >= (passingScore ?? 0),
      feedback: lastAttempt.feedback,
      answers: lastAttempt.answers.map((ans) => ({
        attemptId: ans.attemptId,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        selectedOptionIds: ans.selections.map((s) => s.optionId),
        textResponse: ans.textResponse,
        isCorrect: ans.isCorrect ?? false,
      })),
    };
  } catch (error) {
    console.error("getLastQuizResult error", error);
    return null;
  }
}

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
      input.answers.map((answer) => [answer.questionId, answer])
    );

    const gradableQuestions = quiz.questions.filter((question) =>
      isGradableQuestionType(question.questionType)
    );

    const gradedRows: Array<{
      questionId: string;
      selectedOptionId: string | null;
      selectedOptionIds: string[];
      textResponse: string | null;
      isCorrect: boolean | null;
    }> = [];

    for (const question of quiz.questions) {
      const submitted = submittedAnswerMap.get(question.id);
      const questionType = question.questionType;

      if (questionType === QuestionType.multiple) {
        const selectedOptionIds = submitted?.selectedOptionIds ?? [];
        for (const optionId of selectedOptionIds) {
          const option = optionMap.get(optionId);
          if (!option || option.questionId !== question.id) {
            throw new Error("Invalid selected option.");
          }
        }

        const correctOptionIds = new Set(
          question.options.filter((option) => option.isCorrect).map((o) => o.id)
        );
        const isCorrect = gradeMultipleChoice(
          correctOptionIds,
          selectedOptionIds
        );

        gradedRows.push({
          questionId: question.id,
          selectedOptionId: null,
          selectedOptionIds,
          textResponse: null,
          isCorrect,
        });
        continue;
      }

      if (questionType === QuestionType.essay) {
        gradedRows.push({
          questionId: question.id,
          selectedOptionId: null,
          selectedOptionIds: [],
          textResponse: submitted?.textResponse?.trim() || null,
          isCorrect: null,
        });
        continue;
      }

      if (questionType === QuestionType.assessment) {
        const selectedOptionId = submitted?.selectedOptionId ?? null;
        if (selectedOptionId) {
          const selectedOption = optionMap.get(selectedOptionId);
          if (
            !selectedOption ||
            selectedOption.questionId !== question.id
          ) {
            throw new Error("Invalid selected option.");
          }
        }

        gradedRows.push({
          questionId: question.id,
          selectedOptionId,
          selectedOptionIds: [],
          textResponse: null,
          isCorrect: null,
        });
        continue;
      }

      const selectedOptionId = submitted?.selectedOptionId ?? null;
      if (selectedOptionId) {
        const selectedOption = optionMap.get(selectedOptionId);
        if (!selectedOption || selectedOption.questionId !== question.id) {
          throw new Error("Invalid selected option.");
        }
      }

      const selectedOption = selectedOptionId
        ? optionMap.get(selectedOptionId)
        : null;

      gradedRows.push({
        questionId: question.id,
        selectedOptionId,
        selectedOptionIds: [],
        textResponse: null,
        isCorrect: selectedOption?.isCorrect ?? false,
      });
    }

    const correctCount = gradedRows.filter(
      (row) => row.isCorrect === true
    ).length;

    const score =
      gradableQuestions.length > 0
        ? Math.round((correctCount / gradableQuestions.length) * 100)
        : 100;
    const passingScore = quiz.passingScore ?? 0;
    const passed = score >= passingScore;

    await prisma.$transaction(async (tx) => {
      await tx.quizAnswer.deleteMany({
        where: {
          attemptId: attempt.id,
        },
      });

      for (const row of gradedRows) {
        const answerRow = await tx.quizAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: row.questionId,
            selectedOptionId: row.selectedOptionId,
            textResponse: row.textResponse,
            isCorrect: row.isCorrect,
          },
        });

        if (row.selectedOptionIds.length > 0) {
          await tx.quizAnswerSelection.createMany({
            data: row.selectedOptionIds.map((optionId) => ({
              answerId: answerRow.id,
              optionId,
            })),
          });
        }
      }

      await tx.quizAttempt.update({
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
      });
    });

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
      answers: gradedRows.map((row) => ({
        attemptId: attempt.id,
        questionId: row.questionId,
        selectedOptionId: row.selectedOptionId,
        selectedOptionIds: row.selectedOptionIds,
        textResponse: row.textResponse,
        isCorrect: row.isCorrect ?? false,
      })),
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
