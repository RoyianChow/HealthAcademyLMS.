import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { AiAdvisorPanel, AiAdvisorProvider } from "@/components/chat/ai-advisor";
import { requireUser } from "@/app/data/user/require-user";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import {
  getAccessibleCoursesForUser,
  buildCourseSummaries,
} from "@/lib/chat/course-context";
import { listConversationSummariesForUser } from "@/lib/chat/store";

export async function SidebarShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await requireUser();
  const [user, conversationSummaries] = await Promise.all([
    resolveChatUserContext(sessionUser.id),
    listConversationSummariesForUser(sessionUser.id),
  ]);
  const courses = await getAccessibleCoursesForUser(user);
  const courseSummaries = buildCourseSummaries(courses);
  const initialConversationId = conversationSummaries[0].id;

  return (
    <AiAdvisorProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" user={sessionUser} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
        <AiAdvisorPanel
          initialUser={user}
          courseSummaries={courseSummaries}
          initialConversationSummaries={conversationSummaries}
          initialConversationId={initialConversationId}
        />
      </SidebarProvider>
    </AiAdvisorProvider>
  );
}
