import type { MigrationState, WPQuestion } from "../state";
import { WPClient } from "../wp-client";

const KNOWN_TYPES = new Set([
  "single",
  "multiple",
  "essay",
  "assessment_answer",
]);

function toIntId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return toIntId((value as { id: unknown }).id);
  }
  return undefined;
}

function resolveQuizId(question: WPQuestion & Record<string, unknown>): number | undefined {
  const candidates = ["quiz", "quiz_id", "quizId", "parent"] as const;
  for (const key of candidates) {
    const id = toIntId(question[key]);
    if (id !== undefined) return id;
  }
  return undefined;
}

function normalizeQuestion(
  raw: WPQuestion & Record<string, unknown>
): WPQuestion {
  return {
    ...raw,
    quiz: resolveQuizId(raw),
    answers: raw.answers ?? [],
  };
}

function partitionQuestions(rawQuestions: WPQuestion[]) {
  const wpQuestions: WPQuestion[] = [];
  const skippedQuestions: WPQuestion[] = [];

  for (const raw of rawQuestions) {
    const normalized = normalizeQuestion(
      raw as WPQuestion & Record<string, unknown>
    );

    if (KNOWN_TYPES.has(normalized.question_type)) {
      wpQuestions.push(normalized);
    } else {
      skippedQuestions.push(normalized);
    }
  }

  return { wpQuestions, skippedQuestions };
}

export async function fetchQuizzesNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 1c: Fetching quizzes and questions ===");

  const client = new WPClient(state.jwtToken);

  const wpQuizzes = await client.fetchQuizzes();
  console.log(`Found ${wpQuizzes.length} quizzes`);

  const rawQuestions = await client.fetchQuestions();
  console.log(`Found ${rawQuestions.length} questions`);

  let { wpQuestions, skippedQuestions } = partitionQuestions(rawQuestions);

  // Always fetch per-quiz so every question is linked to its parent quiz ID.
  console.log("  Fetching questions per quiz to link parent quiz IDs…");
  const byId = new Map<number, WPQuestion>();
  for (const q of [...wpQuestions, ...skippedQuestions]) {
    byId.set(q.id, q);
  }

  for (const quiz of wpQuizzes) {
    const perQuiz = await client.fetchQuestionsForQuiz(quiz.id);
    for (const raw of perQuiz) {
      const normalized = normalizeQuestion(
        raw as WPQuestion & Record<string, unknown>
      );
      normalized.quiz = quiz.id;
      byId.set(normalized.id, normalized);
    }
  }

  const merged = [...byId.values()];
  ({ wpQuestions, skippedQuestions } = partitionQuestions(merged));

  const linkedAfter = wpQuestions.filter((q) => q.quiz !== undefined).length;
  console.log(
    `  Questions linked to quiz after per-quiz fetch: ${linkedAfter}/${wpQuestions.length}`
  );

  const byType = skippedQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`  Migratable: ${wpQuestions.length}`);
  console.log(`  Skipped: ${skippedQuestions.length}`, byType);

  return {
    wpQuizzes,
    wpQuestions,
    skippedQuestions,
    migrationLog: [
      {
        phase: "fetchQuizzes",
        message: `Fetched ${wpQuizzes.length} quizzes, ${wpQuestions.length} migratable questions, skipped ${skippedQuestions.length}`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
