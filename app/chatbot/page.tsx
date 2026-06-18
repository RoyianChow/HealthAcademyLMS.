import { FloatingChatDynamic } from "@/components/chat/floating-chat-dynamic";
import { requireUser } from "@/app/data/user/require-user";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import {
  getAccessibleCoursesForUser,
  buildCourseSummaries,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";

export default async function ChatbotPage() {
  const sessionUser = await requireUser();

  const [user, conversationSummaries] = await Promise.all([
    resolveChatUserContext(sessionUser.id),
    listConversationSummariesForUser(sessionUser.id),
  ]);
  const courses = await getAccessibleCoursesForUser(user);
  const courseSummaries = buildCourseSummaries(courses);
  const initialConversationId = conversationSummaries[0].id;

  return (
    <FloatingChatDynamic
      initialUser={user}
      courseSummaries={courseSummaries}
      initialConversationSummaries={conversationSummaries}
      initialConversationId={initialConversationId}
      variant="fullscreen"
    />
  );
}
