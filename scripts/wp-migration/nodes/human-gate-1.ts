import { interrupt } from "@langchain/langgraph";
import { collectMediaUrlsFromCurriculum } from "../content-parser";
import { getCourseThumbnailUrl } from "../idempotency";
import type { MigrationState } from "../state";

function buildAuditSummary(state: MigrationState) {
  const published = state.wpCourses.filter((c) => c.status === "publish").length;
  const draft = state.wpCourses.length - published;

  const storable = state.interactiveTopics.filter((t) => t.isStorable);
  const reactCdn = state.interactiveTopics.filter(
    (t) => t.classification.isReactCDN
  );

  const skippedByType = state.skippedQuestions.reduce<Record<string, number>>(
    (acc, q) => {
      acc[q.question_type] = (acc[q.question_type] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const { pdfUrls, mp4Urls, imageUrls } = collectMediaUrlsFromCurriculum(
    state.wpLessons,
    state.wpTopics
  );

  return {
    courses: {
      total: state.wpCourses.length,
      published,
      draft,
      names: state.wpCourses.map((c) => ({
        id: c.id,
        title: c.title.rendered,
        status: c.status,
      })),
    },
    content: {
      lessons: state.wpLessons.length,
      topics: state.wpTopics.length,
      quizzes: state.wpQuizzes.length,
      questions: state.wpQuestions.length,
    },
    interactive: {
      total: state.interactiveTopics.length,
      storable: storable.length,
      reactCdn: reactCdn.length,
      reactCdnModules: reactCdn.map((t) => t.title),
      note: "All interactive activities (including React CDN modules) are stored in Lesson.interactiveScript",
      storableTitles: storable.map((t) => t.title),
    },
    skippedQuestions: {
      total: state.skippedQuestions.length,
      byType: skippedByType,
      ids: state.skippedQuestions.map((q) => ({
        id: q.id,
        type: q.question_type,
        title: q.title.rendered,
      })),
    },
    thumbnails: {
      coursesWithFeaturedImage: state.wpCourses.filter(
        (c) => getCourseThumbnailUrl(c) !== null
      ).length,
      coursesWithoutFeaturedImage: state.wpCourses.filter(
        (c) => getCourseThumbnailUrl(c) === null
      ).length,
      note: "Courses with no WP featured image will retain MIGRATION_PENDING fileKey",
    },
    mediaEstimate: {
      pdfs: pdfUrls.length,
      mp4s: mp4Urls.length,
      images: imageUrls.length,
      total: pdfUrls.length + mp4Urls.length + imageUrls.length,
    },
  };
}

export async function humanGate1Node(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  const summary = buildAuditSummary(state);

  console.log("\n=== Phase 2: Pre-Migration Audit (Human Gate 1) ===");
  console.log(JSON.stringify(summary, null, 2));

  const response = interrupt({
    gate: "humanGate1",
    message: "Pre-migration audit complete. Review the summary above.",
    summary,
    prompt: "Type 'yes' to proceed with migration, or 'no' to abort.",
  }) as { proceed?: boolean } | string;

  let proceed = false;
  if (typeof response === "string") {
    proceed = response.trim().toLowerCase() === "yes";
  } else if (response && typeof response === "object") {
    proceed = response.proceed === true;
  }

  console.log(proceed ? "Human approved migration." : "Human aborted migration.");

  return {
    gate1Proceed: proceed,
    migrationLog: [
      {
        phase: "humanGate1",
        message: proceed ? "Approved by human" : "Aborted by human",
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function routeAfterGate1(state: MigrationState): "loadExisting" | "__end__" {
  return state.gate1Proceed ? "loadExisting" : "__end__";
}
