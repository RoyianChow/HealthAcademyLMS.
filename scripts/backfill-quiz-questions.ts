/**
 * Backfill quiz questions from WordPress without re-running the full migration.
 * Run: npx tsx --env-file=.env scripts/backfill-quiz-questions.ts
 */
import { prisma } from "../lib/db";
import { authenticateNode } from "./wp-migration/nodes/authenticate";
import { fetchCoursesNode } from "./wp-migration/nodes/fetch-courses";
import { fetchContentNode } from "./wp-migration/nodes/fetch-content";
import { fetchQuizzesNode } from "./wp-migration/nodes/fetch-quizzes";
import { loadExistingNode } from "./wp-migration/nodes/load-existing";
import { writeQuizzesNode } from "./wp-migration/nodes/write-quizzes";
import type { MigrationState } from "./wp-migration/state";

async function main() {
  console.log("WordPress quiz question backfill");
  console.log("================================\n");

  let state = {} as MigrationState;

  const steps = [
    authenticateNode,
    fetchCoursesNode,
    fetchContentNode,
    fetchQuizzesNode,
    loadExistingNode,
    writeQuizzesNode,
  ];

  for (const step of steps) {
    const patch = await step(state);
    state = { ...state, ...patch };
  }

  const [questionCount, optionCount] = await Promise.all([
    prisma.quizQuestion.count(),
    prisma.quizOption.count(),
  ]);

  console.log("\nDatabase totals after backfill:");
  console.log(`  QuizQuestion: ${questionCount}`);
  console.log(`  QuizOption: ${optionCount}`);

  if (state.errors?.length) {
    console.log(`\nErrors (${state.errors.length}):`);
    state.errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
