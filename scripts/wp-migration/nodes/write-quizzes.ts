import { QuestionType } from "@/lib/question-type";
import { prisma } from "@/lib/db";
import {
  coerceRenderedHtml,
  decodeHtml,
  stripHtmlTags,
} from "../content-parser";
import { collectQuizIdsFromSteps } from "../placement";
import type { MigrationState, WPQuestion, WPQuiz } from "../state";

function quizById(quizzes: WPQuiz[], id: number): WPQuiz | undefined {
  return quizzes.find((q) => q.id === id);
}

function quizTitle(wpQuiz: WPQuiz): string {
  return decodeHtml(coerceRenderedHtml(wpQuiz.title) || "Quiz");
}

function toQuestionType(wpType: string): QuestionType {
  if (wpType === "multiple") return QuestionType.multiple;
  if (wpType === "essay") return QuestionType.essay;
  if (wpType === "assessment_answer") return QuestionType.assessment;
  return QuestionType.single;
}

async function findExistingQuiz(
  courseId: string,
  chapterId: string | null,
  title: string
) {
  const candidates = await prisma.quiz.findMany({
    where: { courseId, chapterId, title },
    select: {
      id: true,
      _count: { select: { questions: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort(
    (a, b) =>
      b._count.questions - a._count.questions ||
      a.createdAt.getTime() - b.createdAt.getTime()
  )[0];
}

async function ensureQuestion(
  quizId: string,
  wpQuestion: WPQuestion,
  fallbackIndex: number
): Promise<{ questionsCreated: number; optionsCreated: number }> {
  const answers = wpQuestion.answers ?? [];
  const questionType = toQuestionType(wpQuestion.question_type);

  if (
    answers.length === 0 &&
    questionType !== QuestionType.essay &&
    questionType !== QuestionType.assessment
  ) {
    return { questionsCreated: 0, optionsCreated: 0 };
  }

  const position = wpQuestion.menu_order ?? fallbackIndex;
  const questionText =
    stripHtmlTags(coerceRenderedHtml(wpQuestion.content)) ||
    decodeHtml(coerceRenderedHtml(wpQuestion.title) || "Question");
  const explanation = wpQuestion.correct_message
    ? decodeHtml(wpQuestion.correct_message)
    : null;

  const existing = await prisma.quizQuestion.findUnique({
    where: { quizId_position: { quizId, position } },
    include: { options: true },
  });

  if (existing) {
    if (questionType === QuestionType.essay) {
      return { questionsCreated: 0, optionsCreated: 0 };
    }

    if (existing.options.length >= answers.length) {
      return { questionsCreated: 0, optionsCreated: 0 };
    }

    const existingPositions = new Set(existing.options.map((o) => o.position));
    let optionsCreated = 0;

    for (let optIdx = 0; optIdx < answers.length; optIdx++) {
      if (existingPositions.has(optIdx)) continue;

      await prisma.quizOption.create({
        data: {
          text: decodeHtml(
            typeof answers[optIdx]._answer === "string"
              ? answers[optIdx]._answer
              : coerceRenderedHtml(answers[optIdx]._answer as never)
          ),
          isCorrect: answers[optIdx]._correct,
          position: optIdx,
          questionId: existing.id,
        },
      });
      optionsCreated++;
    }

    return { questionsCreated: 0, optionsCreated };
  }

  const created = await prisma.quizQuestion.create({
    data: {
      question: questionText,
      position,
      explanation,
      questionType,
      quizId,
      options:
        answers.length > 0
          ? {
              create: answers.map((answer, optIdx) => ({
                text: decodeHtml(
                  typeof answer._answer === "string"
                    ? answer._answer
                    : coerceRenderedHtml(answer._answer as never)
                ),
                isCorrect: answer._correct,
                position: optIdx,
              })),
            }
          : undefined,
    },
    include: { options: true },
  });

  return { questionsCreated: 1, optionsCreated: created.options.length };
}

export async function writeQuizzesNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 5b: Writing quizzes to Prisma ===");

  const quizPlacement = collectQuizIdsFromSteps(state);
  const quizMap: Record<number, string> = { ...state.quizMap };
  const errors: string[] = [];

  let quizzesCreated = 0;
  let questionsCreated = 0;
  let optionsCreated = 0;

  const questionsByQuiz = new Map<number, typeof state.wpQuestions>();

  for (const question of state.wpQuestions) {
    if (!question.quiz) continue;
    const list = questionsByQuiz.get(question.quiz) ?? [];
    list.push(question);
    questionsByQuiz.set(question.quiz, list);
  }

  for (const [wpQuizId, placement] of quizPlacement) {
    const wpQuiz = quizById(state.wpQuizzes, wpQuizId);
    if (!wpQuiz) {
      errors.push(`Quiz ${wpQuizId} not found in fetched pool`);
      continue;
    }

    try {
      const title = quizTitle(wpQuiz);
      const descriptionHtml = coerceRenderedHtml(wpQuiz.content);
      let quizId = quizMap[wpQuizId];

      if (!quizId) {
        const existing = await findExistingQuiz(
          placement.courseId,
          placement.chapterId ?? null,
          title
        );

        if (existing) {
          quizId = existing.id;
          console.log(`  Quiz ${wpQuizId}: "${title}" — using existing (${quizId})`);
        } else {
          const created = await prisma.quiz.create({
            data: {
              title,
              description: descriptionHtml
                ? stripHtmlTags(descriptionHtml)
                : null,
              courseId: placement.courseId,
              chapterId: placement.chapterId ?? null,
              isPublished: true,
            },
          });
          quizId = created.id;
          quizzesCreated++;
          console.log(`  Quiz ${wpQuizId}: "${title}" — created (${quizId})`);
        }
      }

      quizMap[wpQuizId] = quizId;

      const questions = questionsByQuiz.get(wpQuizId) ?? [];
      const sorted = [...questions].sort(
        (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0)
      );

      let quizQuestionsCreated = 0;
      for (let i = 0; i < sorted.length; i++) {
        const wpQuestion = sorted[i];
        const questionType = toQuestionType(wpQuestion.question_type);
        const answers = wpQuestion.answers ?? [];

        if (
          answers.length === 0 &&
          questionType !== QuestionType.essay &&
          questionType !== QuestionType.assessment
        ) {
          errors.push(`Question ${wpQuestion.id} has no answers — skipped`);
          continue;
        }

        const result = await ensureQuestion(quizId, wpQuestion, i);
        quizQuestionsCreated += result.questionsCreated;
        questionsCreated += result.questionsCreated;
        optionsCreated += result.optionsCreated;
      }

      console.log(
        `  Quiz ${wpQuizId}: "${title}" — ${sorted.length} WP questions, ${quizQuestionsCreated} newly created`
      );
    } catch (err) {
      const msg = `Failed to migrate quiz ${wpQuizId}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  const unlinked = state.wpQuestions.filter(
    (q) => q.quiz && !quizPlacement.has(q.quiz)
  );
  if (unlinked.length > 0) {
    console.warn(
      `  ${unlinked.length} questions linked to quizzes not in any steps tree`
    );
  }

  console.log(
    `Quizzes written: ${quizzesCreated} new quizzes, ${questionsCreated} new questions, ${optionsCreated} new options`
  );

  return {
    quizMap,
    errors,
    migrationStats: {
      ...state.migrationStats,
      quizzesCreated,
      questionsCreated,
      optionsCreated,
    },
    migrationLog: [
      {
        phase: "writeQuizzes",
        message: `Created ${quizzesCreated} quizzes, ${questionsCreated} questions (fill-missing mode)`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
