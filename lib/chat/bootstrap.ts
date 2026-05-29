import "server-only";

import {
  buildCourseSummaries,
  getAccessibleCoursesForUser,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import type { ChatBootstrap } from "@/lib/chat/types";

export async function getStandaloneChatBootstrap(): Promise<ChatBootstrap> {
  const user = await resolveChatUserContext();
  const accessibleCourses = await getAccessibleCoursesForUser(user);
  const conversationSummaries = await listConversationSummariesForUser(user.id);

  return {
    user,
    courseSummaries: buildCourseSummaries(accessibleCourses),
    conversationSummaries,
    initialConversationId: conversationSummaries[0]?.id ?? "default",
  };
}
