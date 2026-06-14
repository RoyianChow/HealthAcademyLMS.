import {
  classifyActivity,
  decodeHtml,
  isInteractiveActivity,
  isStorableInteractive,
} from "../content-parser";
import type { InteractiveTopicMeta, MigrationState } from "../state";
import { WPClient } from "../wp-client";

export async function fetchContentNode(
  state: MigrationState
): Promise<Partial<MigrationState>> {
  console.log("\n=== Phase 1b: Fetching lessons and topics ===");

  const client = new WPClient(state.jwtToken);

  const wpLessons = await client.fetchLessons();
  console.log(`Found ${wpLessons.length} WP lessons (→ Chapters)`);

  const wpTopics = await client.fetchTopics();
  console.log(`Found ${wpTopics.length} WP topics (→ Lessons)`);

  const interactiveTopics: InteractiveTopicMeta[] = [];

  for (const topic of wpTopics) {
    if (!isInteractiveActivity(topic)) continue;

    const classification = classifyActivity(topic.content.rendered);
    interactiveTopics.push({
      topicId: topic.id,
      title: decodeHtml(topic.title.rendered),
      classification,
      isStorable: isStorableInteractive(topic),
    });
  }

  const storable = interactiveTopics.filter((t) => t.isStorable).length;
  const reactCdn = interactiveTopics.filter((t) => !t.isStorable).length;
  console.log(
    `  Interactive activities: ${interactiveTopics.length} total (${storable} storable, ${reactCdn} React CDN)`
  );

  return {
    wpLessons,
    wpTopics,
    interactiveTopics,
    migrationLog: [
      {
        phase: "fetchContent",
        message: `Fetched ${wpLessons.length} lessons, ${wpTopics.length} topics, ${interactiveTopics.length} interactive`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
