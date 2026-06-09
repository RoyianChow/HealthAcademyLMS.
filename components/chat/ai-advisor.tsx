"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { PanelRight, Sparkles } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingChat } from "@/components/chat/floating-chat";
import type {
  ChatBootstrapCourseSummary,
  ChatConversationSummary,
  ChatUserContext,
} from "@/lib/chat/types";

const storageKey = "ai-advisor-open";

type AiAdvisorContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  courseSlug: string | null;
  chatSessionKey: number;
};

const AiAdvisorContext = React.createContext<AiAdvisorContextValue | null>(null);

export function useAiAdvisor() {
  const context = React.useContext(AiAdvisorContext);
  if (!context) {
    throw new Error("useAiAdvisor must be used within an AiAdvisorProvider.");
  }
  return context;
}

function parseCourseSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const slug = match?.[1];
  if (!slug || slug === "community") {
    return null;
  }
  return slug;
}

export function AiAdvisorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [courseSlug, setCourseSlug] = React.useState<string | null>(null);
  const [chatSessionKey, setChatSessionKey] = React.useState(0);
  const pendingCourseChatRef = React.useRef(false);
  const lastCourseSlugRef = React.useRef<string | null>(null);
  const isOpenRef = React.useRef(false);

  const bumpChatSession = React.useCallback(() => {
    setChatSessionKey((current) => current + 1);
  }, []);

  const persist = React.useCallback(
    (value: boolean) => {
      isOpenRef.current = value;
      setIsOpen(value);
      try {
        window.localStorage.setItem(storageKey, String(value));
      } catch {
        // ignore
      }
      if (value && pendingCourseChatRef.current) {
        bumpChatSession();
        pendingCourseChatRef.current = false;
      }
    },
    [bumpChatSession]
  );

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "true") {
        persist(true);
      }
    } catch {
      // ignore
    }
  }, [persist]);

  const notifyCourseOpened = React.useCallback(
    (slug: string | null) => {
      if (slug === lastCourseSlugRef.current) {
        return;
      }
      lastCourseSlugRef.current = slug;

      if (!slug) {
        setCourseSlug(null);
        if (isOpenRef.current) {
          bumpChatSession();
        } else {
          pendingCourseChatRef.current = true;
        }
        return;
      }

      setCourseSlug(slug);
      if (isOpenRef.current) {
        bumpChatSession();
      } else {
        pendingCourseChatRef.current = true;
      }
    },
    [bumpChatSession]
  );

  const value = React.useMemo<AiAdvisorContextValue>(
    () => ({
      isOpen,
      open: () => persist(true),
      close: () => persist(false),
      toggle: () => persist(!isOpen),
      courseSlug,
      chatSessionKey,
    }),
    [isOpen, persist, courseSlug, chatSessionKey]
  );

  return (
    <AiAdvisorContext.Provider value={value}>
      <AiAdvisorPathSync onCourseChange={notifyCourseOpened} />
      {children}
    </AiAdvisorContext.Provider>
  );
}

function AiAdvisorPathSync({
  onCourseChange,
}: {
  onCourseChange: (slug: string | null) => void;
}) {
  const pathname = usePathname();
  const slug = parseCourseSlugFromPath(pathname);

  React.useEffect(() => {
    onCourseChange(slug);
  }, [slug, onCourseChange]);

  return null;
}

export function AiAdvisorTrigger({ className }: { className?: string }) {
  const { isOpen, toggle } = useAiAdvisor();

  return (
    <Button
      aria-label="Toggle AI Advisor"
      aria-pressed={isOpen}
      className={cn("relative size-8", className)}
      onClick={toggle}
      size="icon"
      title="Toggle AI Advisor"
      variant={isOpen ? "secondary" : "ghost"}
    >
      <PanelRight className="size-5" />
      <Sparkles className="absolute -right-0.5 -top-0.5 size-3 text-primary" />
      <span className="sr-only">AI Advisor</span>
    </Button>
  );
}

type AiAdvisorPanelProps = {
  initialUser: ChatUserContext;
  courseSummaries: ChatBootstrapCourseSummary[];
  initialConversationSummaries: ChatConversationSummary[];
  initialConversationId: string;
};

export function AiAdvisorPanel(props: AiAdvisorPanelProps) {
  const { isOpen, close, courseSlug, chatSessionKey } = useAiAdvisor();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setHasMounted(true);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  const chat = hasMounted ? (
    <FloatingChat
      {...props}
      chatSessionKey={chatSessionKey}
      courseSlug={courseSlug}
      onClose={close}
      variant="sidebar"
    />
  ) : null;

  if (isMobile) {
    return (
      <>
        {isOpen ? (
          <button
            aria-label="Close AI advisor"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={close}
            type="button"
          />
        ) : null}
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-[min(26rem,100vw)] border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {chat}
        </aside>
      </>
    );
  }

  return (
    <aside
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "sticky top-0 z-30 hidden h-svh shrink-0 self-start overflow-hidden transition-[width] duration-300 ease-in-out md:block",
        "w-0 data-[state=open]:w-[26rem] data-[state=open]:border-l data-[state=open]:border-border lg:data-[state=open]:w-[32rem]"
      )}
    >
      <div className="h-full w-[26rem] lg:w-[32rem]">{chat}</div>
    </aside>
  );
}
