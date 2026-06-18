import { interrupt } from "@langchain/langgraph";
import type { MigrationState } from "../state";

function buildFinalReport(state: MigrationState) {
  const reactCdn = state.interactiveTopics.filter((t) => !t.isStorable);

  const skippedByType = state.skippedQuestions.reduce<Record<string, number>>(
    (acc, q) => {
      acc[q.question_type] = (acc[q.question_type] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const coursesNeedingStripe = state.wpCourses
    .filter((c) => state.courseMap[c.id])
    .map((c) => ({
      wpId: c.id,
      njId: state.courseMap[c.id],
      title: c.title.rendered,
      placeholder: state.stripeMap[c.id],
    }));

  return {
    recordsCreated: state.migrationStats,
    mediaUploaded: {
      pdfs: state.migrationStats.pdfsUploaded,
      mp4s: state.migrationStats.mp4sUploaded,
      totalBytes: state.migrationStats.totalBytesUploaded,
      queued: state.mediaQueue.length,
      succeeded: Object.keys(state.mediaMap).length,
    },
    actionItems: {
      stripePriceFix: coursesNeedingStripe,
      thumbnailUpload: coursesNeedingStripe.map((c) => ({
        ...c,
        note: 'Replace fileKey "MIGRATION_PENDING" with real thumbnail',
      })),
      reactCdnRebuild: reactCdn.map((t) => t.title),
      skippedQuestions: {
        byType: skippedByType,
        ids: state.skippedQuestions.map((q) => q.id),
      },
    },
    errors: state.errors,
    migrationLog: state.migrationLog,
  };
}

export async function humanGate2Node(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  const report = buildFinalReport(state);

  console.log("\n=== Phase 6: Post-Migration Report (Human Gate 2) ===");
  console.log(JSON.stringify(report, null, 2));

  interrupt({
    gate: "humanGate2",
    message: "Migration complete. Review the final report above.",
    report,
    prompt: "Press Enter to acknowledge and finish.",
  });

  return {
    migrationLog: [
      {
        phase: "humanGate2",
        message: "Final report acknowledged by human",
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
