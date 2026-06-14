import type { MigrationState } from "../state";
import { WPClient } from "../wp-client";

export async function fetchCoursesNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 1a: Fetching courses and curriculum steps ===");

  const client = new WPClient(state.jwtToken);
  const wpCourses = await client.fetchCourses();
  console.log(`Found ${wpCourses.length} courses`);

  const wpStepTrees: Record<number, import("../state").StepsTree> = {};

  for (const course of wpCourses) {
    try {
      const steps = await client.fetchCourseSteps(course.id);
      wpStepTrees[course.id] = steps;
      const lessonCount = Object.keys(steps.h?.["sfwd-lessons"] ?? {}).length;
      console.log(
        `  Course ${course.id} "${course.title.rendered}": ${lessonCount} modules in steps tree`
      );
    } catch (err) {
      const msg = `Failed to fetch steps for course ${course.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  ${msg}`);
      return {
        errors: [msg],
        migrationLog: [
          {
            phase: "fetchCourses",
            message: msg,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }
  }

  return {
    wpCourses,
    wpStepTrees,
    migrationLog: [
      {
        phase: "fetchCourses",
        message: `Fetched ${wpCourses.length} courses with ${Object.keys(wpStepTrees).length} step trees`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
