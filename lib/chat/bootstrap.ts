import "server-only";

import {
  buildCourseSummaries,
  getAccessibleCoursesForUser,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import { requireUser } from "@/app/data/user/require-user";
import type { ChatBootstrap } from "@/lib/chat/types";

export async function getStandaloneChatBootstrap(): Promise<ChatBootstrap> {
  const sessionUser = await requireUser();
  const user = await resolveChatUserContext(sessionUser.id);
  const accessibleCourses = await getAccessibleCoursesForUser(user);
  const conversationSummaries = await listConversationSummariesForUser(user.id);

  return {
    user,
    courseSummaries: buildCourseSummaries(accessibleCourses),
    conversationSummaries,
    initialConversationId: conversationSummaries[0]?.id ?? "default",
  };
}
