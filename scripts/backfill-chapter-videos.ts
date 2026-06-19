/**
 * Upload WP module-level MP4s and create chapter intro lessons with videos.
 * Run: npx tsx --env-file=.env scripts/backfill-chapter-videos.ts
 */
import { authenticateNode } from "./wp-migration/nodes/authenticate";
import { fetchContentNode } from "./wp-migration/nodes/fetch-content";
import { fetchCoursesNode } from "./wp-migration/nodes/fetch-courses";
import { fetchQuizzesNode } from "./wp-migration/nodes/fetch-quizzes";
import { loadExistingNode } from "./wp-migration/nodes/load-existing";
import { uploadMediaNode } from "./wp-migration/nodes/upload-media";
import { writeCurriculumNode } from "./wp-migration/nodes/write-curriculum";
import type { MigrationState } from "./wp-migration/state";

async function main() {
  console.log("Chapter video backfill");
  console.log("======================\n");

  let state = {} as MigrationState;

  const steps = [
    { name: "authenticate", fn: authenticateNode },
    { name: "fetchCourses", fn: fetchCoursesNode },
    { name: "fetchContent", fn: fetchContentNode },
    { name: "fetchQuizzes", fn: fetchQuizzesNode },
    { name: "loadExisting", fn: loadExistingNode },
    { name: "uploadMedia", fn: uploadMediaNode },
    { name: "writeCurriculum", fn: writeCurriculumNode },
  ];

  for (const step of steps) {
    console.log(`\n>>> ${step.name}`);
    const patch = await step.fn(state);
    state = { ...state, ...patch };
  }

  console.log("\nDone.");
  console.log(
    `Videos created: ${state.migrationStats?.videosCreated ?? 0}, ` +
      `MP4s uploaded: ${state.migrationStats?.mp4sUploaded ?? 0}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
