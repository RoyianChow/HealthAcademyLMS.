import { loadExistingStripeMap } from "../idempotency";
import type { MigrationState } from "../state";

export async function createStripePlaceholdersNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 4: Resolving Stripe price placeholders ===");

  const stripeMap = await loadExistingStripeMap(state);

  for (const course of state.wpCourses) {
    const value = stripeMap[course.id];
    const label = value?.startsWith("MIGRATION_PENDING")
      ? `placeholder ${value}`
      : `existing ${value}`;
    console.log(`  Course ${course.id}: stripePriceId = ${label}`);
  }

  return {
    stripeMap,
    migrationLog: [
      {
        phase: "createStripePlaceholders",
        message: `Resolved ${Object.keys(stripeMap).length} Stripe price IDs`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
