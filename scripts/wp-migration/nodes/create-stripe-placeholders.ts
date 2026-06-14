import type { MigrationState } from "../state";

export async function createStripePlaceholdersNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 4: Creating Stripe price placeholders ===");

  const stripeMap: Record<number, string> = {};

  for (const course of state.wpCourses) {
    stripeMap[course.id] = `MIGRATION_PENDING_${course.id}`;
    console.log(
      `  Course ${course.id}: stripePriceId = MIGRATION_PENDING_${course.id}`
    );
  }

  return {
    stripeMap,
    migrationLog: [
      {
        phase: "createStripePlaceholders",
        message: `Created ${Object.keys(stripeMap).length} Stripe placeholders`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
