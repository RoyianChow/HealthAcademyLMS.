// migrate-wordpress.ts
// WordPress/LearnDash → Next.js LMS migration agent (LangGraph)
//
// Run: npx tsx --env-file=.env migrate-wordpress.ts
//
// Required env vars:
//   WP_USERNAME, WP_PASSWORD, WP_BASE_URL (optional, defaults to healthacademy.ca)
//   MIGRATION_OWNER_USER_ID — NJ admin user UUID
//   DATABASE_URL, AWS_*, S3_BUCKET_NAME, NEXT_PUBLIC_S3_PUBLIC_URL

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import { prisma } from "./lib/db";
import { compiledGraph } from "./scripts/wp-migration/graph";
import type { MigrationState } from "./scripts/wp-migration/state";

function prompt(rl: readline.Interface, message: string): Promise<string> {
  return rl.question(message);
}

function getActiveInterruptGate(
  snapshot: Awaited<ReturnType<typeof compiledGraph.getState>>
): string | null {
  for (const task of snapshot.tasks ?? []) {
    if (task.interrupts && task.interrupts.length > 0) {
      const value = task.interrupts[0]?.value as { gate?: string } | undefined;
      return value?.gate ?? task.name ?? null;
    }
  }
  return null;
}

async function handleInterrupts(
  threadId: string,
  rl: readline.Interface
): Promise<void> {
  const config = { configurable: { thread_id: threadId } };

  let result: MigrationState | undefined;

  try {
    result = (await compiledGraph.invoke({}, config)) as MigrationState;
  } catch (err) {
    if (!isGraphInterrupt(err)) throw err;
  }

  while (true) {
    const snapshot = await compiledGraph.getState(config);
    const gate = getActiveInterruptGate(snapshot);

    if (!gate && (!snapshot.next || snapshot.next.length === 0)) {
      console.log("\nMigration graph completed.");
      if (result?.migrationStats) {
        console.log("Final stats:", JSON.stringify(result.migrationStats, null, 2));
      }
      break;
    }

    if (gate === "humanGate1") {
      const answer = await prompt(
        rl,
        "Type 'yes' to proceed with migration, or 'no' to abort: "
      );
      const proceed = answer.trim().toLowerCase() === "yes";
      try {
        result = (await compiledGraph.invoke(
          new Command({ resume: { proceed } }),
          config
        )) as MigrationState;
      } catch (err) {
        if (!isGraphInterrupt(err)) throw err;
      }
      continue;
    }

    if (gate === "humanGate2") {
      await prompt(
        rl,
        "Press Enter to acknowledge the final report and finish: "
      );
      try {
        result = (await compiledGraph.invoke(
          new Command({ resume: true }),
          config
        )) as MigrationState;
      } catch (err) {
        if (!isGraphInterrupt(err)) throw err;
      }
      continue;
    }

    if (snapshot.next && snapshot.next.length > 0) {
      try {
        result = (await compiledGraph.invoke(
          new Command({ resume: true }),
          config
        )) as MigrationState;
      } catch (err) {
        if (!isGraphInterrupt(err)) throw err;
      }
      continue;
    }

    break;
  }
}

async function main() {
  console.log("WordPress → Next.js Migration Agent");
  console.log("====================================\n");

  const required = [
    "WP_USERNAME",
    "WP_PASSWORD",
    "MIGRATION_OWNER_USER_ID",
    "DATABASE_URL",
    "S3_BUCKET_NAME",
    "NEXT_PUBLIC_S3_PUBLIC_URL",
    "AWS_REGION",
    "AWS_ENDPOINT_URL_S3",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }

  const threadId = `migration-${Date.now()}`;
  console.log(`Thread ID: ${threadId}\n`);

  const rl = readline.createInterface({ input, output });

  try {
    await handleInterrupts(threadId, rl);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
