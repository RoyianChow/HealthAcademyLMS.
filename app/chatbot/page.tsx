import { FloatingChat } from "@/components/chat/floating-chat";
import { requireUser } from "@/app/data/user/require-user";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import {
  getAccessibleCoursesForUser,
  buildCourseSummaries,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";

export default async function ChatbotPage() {
  const sessionUser = await requireUser();

  const user = await resolveChatUserContext(sessionUser.id);
  const courses = await getAccessibleCoursesForUser(user);
  const courseSummaries = buildCourseSummaries(courses);
  const conversationSummaries = await listConversationSummariesForUser(user.id);
  const initialConversationId = conversationSummaries[0].id;

  return (
    <FloatingChat
      initialUser={user}
      courseSummaries={courseSummaries}
      initialConversationSummaries={conversationSummaries}
      initialConversationId={initialConversationId}
      variant="fullscreen"
    />
  );
}
