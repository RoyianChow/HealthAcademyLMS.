import { FloatingChat } from "@/components/chat/floating-chat";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import {
  getAccessibleCoursesForUser,
  buildCourseSummaries,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";

export default async function ChatbotPage() {
  const user = await resolveChatUserContext();
  const courses = await getAccessibleCoursesForUser(user);
  const courseSummaries = buildCourseSummaries(courses);
  const conversationSummaries = await listConversationSummariesForUser(user.id);
  const initialConversationId = conversationSummaries[0].id;

  return (
    <main className="relative min-h-screen">
      <FloatingChat
        initialUser={user}
        courseSummaries={courseSummaries}
        initialConversationSummaries={conversationSummaries}
        initialConversationId={initialConversationId}
      />
    </main>
  );
}