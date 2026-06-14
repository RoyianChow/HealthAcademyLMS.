import { prisma } from "@/lib/db";
import {
  coerceRenderedHtml,
  decodeHtml,
  stripHtmlTags,
} from "../content-parser";
import type { MigrationState, WPQuiz } from "../state";

function quizById(quizzes: WPQuiz[], id: number): WPQuiz | undefined {
  return quizzes.find((q) => q.id === id);
}

function collectQuizIdsFromSteps(
  state: MigrationState
): Map<number, { courseId: string; chapterId?: string }> {
  const map = new Map<number, { courseId: string; chapterId?: string }>();

  for (const wpCourse of state.wpCourses) {
    const njCourseId = state.courseMap[wpCourse.id];
    if (!njCourseId) continue;

    const steps = state.wpStepTrees[wpCourse.id];
    if (!steps?.h) continue;

    const lessons = steps.h["sfwd-lessons"] ?? {};
    for (const lessonIdStr of Object.keys(lessons)) {
      const wpLessonId = parseInt(lessonIdStr, 10);
      const njChapterId = state.chapterMap[wpLessonId];
      const lessonNode = lessons[lessonIdStr];

      const lessonQuizzes = lessonNode?.["sfwd-quiz"] ?? {};
      for (const quizIdStr of Object.keys(lessonQuizzes)) {
        map.set(parseInt(quizIdStr, 10), {
          courseId: njCourseId,
          chapterId: njChapterId,
        });
      }

      const topics = lessonNode?.["sfwd-topic"] ?? {};
      for (const topicIdStr of Object.keys(topics)) {
        const topicNode = topics[topicIdStr];
        const topicQuizzes = topicNode?.["sfwd-quiz"] ?? {};
        for (const quizIdStr of Object.keys(topicQuizzes)) {
          map.set(parseInt(quizIdStr, 10), {
            courseId: njCourseId,
            chapterId: njChapterId,
          });
        }
      }
    }

    const courseQuizzes = steps.h["sfwd-quiz"] ?? {};
    for (const quizIdStr of Object.keys(courseQuizzes)) {
      map.set(parseInt(quizIdStr, 10), { courseId: njCourseId });
    }
  }

  return map;
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
      const descriptionHtml = coerceRenderedHtml(wpQuiz.content);
      const quiz = await prisma.quiz.create({
        data: {
          title: decodeHtml(coerceRenderedHtml(wpQuiz.title) || "Quiz"),
          description: descriptionHtml ? stripHtmlTags(descriptionHtml) : null,
          courseId: placement.courseId,
          chapterId: placement.chapterId ?? null,
          isPublished: false,
        },
      });

      quizMap[wpQuizId] = quiz.id;
      quizzesCreated++;

      const questions = questionsByQuiz.get(wpQuizId) ?? [];
      const sorted = [...questions].sort(
        (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0)
      );

      for (let i = 0; i < sorted.length; i++) {
        const wpQuestion = sorted[i];
        const answers = wpQuestion.answers ?? [];

        if (answers.length === 0) {
          errors.push(`Question ${wpQuestion.id} has no answers — skipped`);
          continue;
        }

        const created = await prisma.quizQuestion.create({
          data: {
            question:
              stripHtmlTags(coerceRenderedHtml(wpQuestion.content)) ||
              decodeHtml(coerceRenderedHtml(wpQuestion.title) || "Question"),
            position: wpQuestion.menu_order ?? i,
            explanation: wpQuestion.correct_message
              ? decodeHtml(wpQuestion.correct_message)
              : null,
            quizId: quiz.id,
            options: {
              create: answers.map((answer, optIdx) => ({
                text: decodeHtml(answer._answer),
                isCorrect: answer._correct,
                position: optIdx,
              })),
            },
          },
          include: { options: true },
        });

        questionsCreated++;
        optionsCreated += created.options.length;
      }

      console.log(
        `  Quiz ${wpQuizId}: "${decodeHtml(wpQuiz.title.rendered)}" — ${sorted.length} questions`
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
    `Quizzes written: ${quizzesCreated} quizzes, ${questionsCreated} questions, ${optionsCreated} options`
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
        message: `Created ${quizzesCreated} quizzes, ${questionsCreated} questions`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
