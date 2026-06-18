"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Bot,
  Copy,
  Download,
  History,
  Menu,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  chatModeOptions,
  defaultChatPreferences,
  responseStyleOptions,
  toneOptions,
} from "@/lib/chat/defaults";
import type {
  ChatBootstrapCourseSummary,
  ChatConversationSummary,
  ChatMessage,
  ChatPostResponse,
  ChatPreferences,
  ChatUserContext,
} from "@/lib/chat/types";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FloatingChatProps = {
  initialUser: ChatUserContext;
  courseSummaries: ChatBootstrapCourseSummary[];
  initialConversationSummaries: ChatConversationSummary[];
  initialConversationId: string;
  variant?: "fullscreen" | "floating" | "sidebar";
  onClose?: () => void;
  courseSlug?: string | null;
  chatSessionKey?: number;
};

type StatusMessage = {
  tone: "error" | "success";
  text: string;
} | null;

const prefsKey = "nutrition-chatbot-preferences";
const disclaimerKey = "nutrition-chatbot-disclaimer-accepted";

export function FloatingChat({
  initialUser,
  courseSummaries,
  initialConversationSummaries,
  initialConversationId,
  variant = "fullscreen",
  onClose,
  courseSlug = null,
  chatSessionKey = 0,
}: FloatingChatProps) {
  const isFullscreen = variant === "fullscreen";
  const isSidebar = variant === "sidebar";
  const router = useRouter();

  function handleClose() {
    if (onClose) {
      onClose();
    } else if (isFullscreen) {
      router.back();
    } else {
      setIsOpen(false);
    }
  }

  const shellClassName = cn(
    "chat-widget z-50",
    isSidebar
      ? "flex h-full w-full"
      : isFullscreen
        ? "fixed inset-0 h-dvh w-full"
        : "fixed bottom-2 right-2 h-[min(860px,calc(100vh-1rem))] w-[min(1040px,calc(100vw-1rem))]"
  );
  const panelClassName = cn(
    "relative flex h-full w-full overflow-hidden border border-border bg-background/96 backdrop-blur",
    !isFullscreen && !isSidebar && "rounded-[2rem] chat-shadow"
  );
  const [isOpen, setIsOpen] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationSummaries, setConversationSummaries] = useState(
    initialConversationSummaries
  );
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversationId
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingPdfs, setPendingPdfs] = useState<File[]>([]);
  const [activeCourseId, setActiveCourseId] = useState("all");
  const [preferences, setPreferences] = useState<ChatPreferences>(
    defaultChatPreferences
  );
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isDisclaimerReady, setIsDisclaimerReady] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamingRef = useRef<{
    full: string;
    pos: number;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);
  const conversationSummariesRef = useRef(conversationSummaries);
  const activeConversationIdRef = useRef(activeConversationId);
  conversationSummariesRef.current = conversationSummaries;
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    try {
      setHasAcceptedDisclaimer(window.localStorage.getItem(disclaimerKey) === "true");
    } catch {
      setHasAcceptedDisclaimer(false);
    } finally {
      setIsDisclaimerReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(prefsKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<ChatPreferences>;
      setPreferences({ ...defaultChatPreferences, ...parsed });
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(prefsKey, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!isDisclaimerReady || !hasAcceptedDisclaimer) {
      setIsLoadingHistory(false);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      setIsLoadingHistory(true);

      try {
        const response = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(activeConversationId)}`
        );
        const data = (await response.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load chat history.");
        }

        if (!cancelled) {
          setMessages(data.messages ?? []);
          setStatus(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            tone: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load chat history.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, hasAcceptedDisclaimer, initialUser.id, isDisclaimerReady]);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isLoadingHistory, isSending, streamingContent]);

  // Stop streaming when switching conversations
  useEffect(() => {
    if (streamingRef.current) {
      clearInterval(streamingRef.current.timer);
      streamingRef.current = null;
    }
    setStreamingId(null);
    setStreamingContent("");
  }, [activeConversationId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamingRef.current) {
        clearInterval(streamingRef.current.timer);
      }
    };
  }, []);

  const activeConversation =
    conversationSummaries.find((summary) => summary.id === activeConversationId) ??
    conversationSummaries[0];
  const suggestedPrompts = [
    `What should I focus on this week for ${initialUser.goals[0]?.toLowerCase() ?? "my goals"}?`,
    `Summarize what matters most from ${courseSummaries[0]?.title ?? "my courses"}.`,
    "Give me 3 practical nutrition habits to work on.",
    "What questions should I bring to a functional medicine practitioner about my goals?",
  ];
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  async function sendMessage(nextDraft?: string) {
    if (!hasAcceptedDisclaimer) {
      setStatus({
        tone: "error",
        text: 'Please review the disclaimer and click "I understand" first.',
      });
      return;
    }

    if (isSending) return;

    const message = (nextDraft ?? draft).trim();
    const files = [...pendingPdfs];

    if (!message && files.length === 0) {
      setStatus({ tone: "error", text: "Add a message or attach a PDF first." });
      return;
    }

    const optimisticUserMessage: ChatMessage = {
      id: createClientId(),
      role: "user",
      content: message || "Please use the attached PDFs as context.",
      createdAt: new Date().toISOString(),
      attachments: files.map((file) => ({
        id: `${file.name}-${file.size}`,
        kind: "pdf",
        fileName: file.name,
        sizeLabel: formatBytes(file.size),
      })),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft("");
    setPendingPdfs([]);
    setIsSending(true);
    setStatus(null);

    try {
      const body = new FormData();
      body.append("message", message);
      body.append("conversationId", activeConversationId);
      body.append("activeCourseId", activeCourseId);
      body.append("mode", preferences.mode);
      body.append("responseStyle", preferences.responseStyle);
      body.append("tone", preferences.tone);
      body.append("strictSourceUse", String(preferences.strictSourceUse));
      body.append("pdfScope", preferences.pdfScope);

      for (const pdf of files) {
        body.append("pdf", pdf);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        body,
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/x-ndjson") && response.body) {
        const assistantId = createClientId();
        setStreamingId(assistantId);
        setStreamingContent("");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let donePayload: ChatPostResponse | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const event = JSON.parse(line) as
              | { type: "token"; content: string }
              | ({ type: "done" } & ChatPostResponse)
              | { type: "error"; error: string };

            if (event.type === "token") {
              setStreamingContent((current) => current + event.content);
            } else if (event.type === "error") {
              throw new Error(event.error);
            } else if (event.type === "done") {
              donePayload = event;
            }
          }
        }

        if (!donePayload) {
          throw new Error("Unable to send the message.");
        }

        setStreamingId(null);
        setStreamingContent("");
        setMessages((current) => {
          const withoutOptimistic = current.filter(
            (item) => item.id !== optimisticUserMessage.id
          );
          return [
            ...withoutOptimistic,
            donePayload!.userMessage,
            donePayload!.assistantMessage,
          ];
        });
        setConversationSummaries((current) =>
          [
            donePayload!.conversationSummary,
            ...current.filter(
              (item) => item.id !== donePayload!.conversationSummary.id
            ),
          ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        );
      } else {
        const data = (await response.json()) as ChatPostResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Unable to send the message.");
        }

        setMessages((current) => {
          const withoutOptimistic = current.filter(
            (item) => item.id !== optimisticUserMessage.id
          );
          return [...withoutOptimistic, data.userMessage, data.assistantMessage];
        });
        startStreaming(data.assistantMessage.content, data.assistantMessage.id);
        setConversationSummaries((current) =>
          [data.conversationSummary, ...current.filter((item) => item.id !== data.conversationSummary.id)].sort(
            (left, right) => right.updatedAt.localeCompare(left.updatedAt)
          )
        );
      }
    } catch (error) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticUserMessage.id)
      );
      setDraft(message);
      setPendingPdfs(files);
      setStatus({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Unable to send the message.",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function mutateConversation(
    action: "create" | "rename" | "delete" | "clear",
    payload?: { conversationId?: string; title?: string }
  ) {
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          conversationId: payload?.conversationId,
          title: payload?.title,
          activeConversationId,
        }),
      });
      const data = (await response.json()) as {
        summaries?: ChatConversationSummary[];
        activeConversationId?: string;
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to update threads.");
      }

      setConversationSummaries(data.summaries ?? []);
      if (data.activeConversationId) {
        setActiveConversationId(data.activeConversationId);
      }
      if (action === "create" || action === "clear") {
        setMessages([]);
      }
      setStatus(null);
    } catch (error) {
      setStatus({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Unable to update threads.",
      });
    }
  }

  // Sidebar: on dashboard or course navigation, reuse the most recent empty chat
  // or start fresh; set course dropdown to "all" on dashboard, or the active course.
  useEffect(() => {
    if (!isSidebar || chatSessionKey === 0) return;
    if (!isDisclaimerReady || !hasAcceptedDisclaimer) return;

    if (courseSlug) {
      const course = courseSummaries.find((summary) => summary.slug === courseSlug);
      if (course) {
        setActiveCourseId(course.id);
      }
    } else {
      setActiveCourseId("all");
    }

    const mostRecent = conversationSummariesRef.current[0];
    if (mostRecent?.messageCount === 0) {
      if (activeConversationIdRef.current !== mostRecent.id) {
        setActiveConversationId(mostRecent.id);
      }
      return;
    }

    void mutateConversation("create");
  }, [
    chatSessionKey,
    courseSlug,
    courseSummaries,
    hasAcceptedDisclaimer,
    isDisclaimerReady,
    isSidebar,
  ]);

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setStatus({
        tone: "error",
        text: "Clipboard copy failed in this browser.",
      });
    }
  }

  function exportTranscript() {
    if (messages.length === 0) {
      setStatus({ tone: "error", text: "There is no chat to export yet." });
      return;
    }

    const text = messages
      .map((message) => {
        const speaker = message.role === "assistant" ? "Coach" : initialUser.name;
        return `${speaker} [${formatDateTime(message.createdAt)}]\n${message.content}`;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(activeConversation?.title ?? "nutrition-chat")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ tone: "success", text: "Transcript exported." });
  }

  function onSelectPdfs(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setPendingPdfs((current) => {
      const next = [...current];
      for (const file of files) {
        if (
          next.some(
            (existing) =>
              existing.name === file.name && existing.size === file.size
          )
        ) {
          continue;
        }
        next.push(file);
      }
      return next.slice(0, 3);
    });

    event.currentTarget.value = "";
    setStatus(null);
  }

  function startStreaming(content: string, messageId: string) {
    if (streamingRef.current) {
      clearInterval(streamingRef.current.timer);
      streamingRef.current = null;
    }
    // max_tokens = 700 ≈ 2800 chars at ~4 chars/token; markdown overhead can push ~3200.
    // Hard cap of 8 chars/tick keeps each frame to ≈1–2 words so streaming never looks
    // chunky. Timing across the full range (interval = 35 ms):
    //   200 chars  → 2 chars/tick → ~3.5 s
    //   700 chars  → 5 chars/tick → ~4.9 s
    //   1280 chars → 8 chars/tick (cap) → ~5.6 s
    //   2800 chars → 8 chars/tick → ~12.25 s
    //   3200 chars → 8 chars/tick → ~14 s
    const charsPerTick = Math.max(2, Math.min(8, Math.ceil(content.length / 160)));
    setStreamingId(messageId);
    setStreamingContent("");
    const timer = setInterval(() => {
      const state = streamingRef.current;
      if (!state) return;
      const nextPos = Math.min(state.pos + charsPerTick, state.full.length);
      state.pos = nextPos;
      setStreamingContent(state.full.slice(0, nextPos));
      if (nextPos >= state.full.length) {
        clearInterval(state.timer);
        streamingRef.current = null;
        setStreamingId(null);
      }
    }, 35);
    streamingRef.current = { full: content, pos: 0, timer };
  }

  function acceptDisclaimer() {
    try {
      window.localStorage.setItem(disclaimerKey, "true");
    } catch {}

    setHasAcceptedDisclaimer(true);
    setStatus(null);
  }

  if (!isOpen) {
    return (
      <div className="chat-widget fixed bottom-4 right-4 z-50">
        <Button
          className="h-14 rounded-full px-5 shadow-lg shadow-primary/15"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-5 w-5" />
          Open chat
        </Button>
      </div>
    );
  }

  if (!isDisclaimerReady || !hasAcceptedDisclaimer) {
    return (
      <div className={shellClassName}>
        <div className={panelClassName}>
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Before you continue
                  </p>
                  <h3 className="mt-2 font-heading text-[1.5rem] font-semibold">
                    Important health disclaimer
                  </h3>
                </div>

                <Button
                  aria-label="Close disclaimer"
                  onClick={handleClose}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
              <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-muted/35 p-6 sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-7 w-7" />
                </div>

                <h4 className="mt-4 text-center font-heading text-[1.8rem] font-semibold">
                  Educational support, not medical care
                </h4>
                <p className="mt-4 text-base leading-8 text-muted-foreground">
                  This chatbot is for general educational purposes only. It is not
                  a medical professional and it does not provide medical advice,
                  diagnosis, or treatment.
                </p>
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  Do not use it for emergencies or to replace care from a qualified
                  clinician, registered dietitian, or functional medicine
                  practitioner. For symptoms, medications, allergies, pregnancy,
                  medical conditions, lab results, or treatment decisions, seek
                  personalized care from a licensed professional.
                </p>

                <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-7 text-muted-foreground">
                  By clicking &quot;I understand,&quot; you acknowledge this
                  chatbot is only a learning tool and you will not treat its
                  responses as medical advice.
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button onClick={handleClose} variant="ghost">
                    Close
                  </Button>
                  <Button onClick={acceptDisclaimer}>I understand</Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className={panelClassName}>
        {!isSidebar && (
        <aside
          className={cn(
            "absolute inset-y-0 left-0 z-20 flex w-[min(18rem,86vw)] flex-col border-r border-border bg-background transition-transform md:static md:w-64",
            showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Nutrition coach
                </p>
                <h2 className="mt-2 truncate font-heading text-[1.45rem] font-semibold">
                  {initialUser.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {initialUser.dietaryFocus.join(" | ")}
                </p>
              </div>
              <Button
                aria-label="Close sidebar"
                className="md:hidden"
                onClick={() => setShowSidebar(false)}
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <Button
              className="mt-4 w-full justify-start"
              onClick={() => void mutateConversation("create")}
              variant="secondary"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </Button>
          </div>

          <div className="scrollbar-subtle flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {conversationSummaries.map((summary) => {
              const isActive = summary.id === activeConversationId;

              return (
                <div
                  className={cn(
                    "rounded-2xl border p-3 transition-colors",
                    isActive
                      ? "border-primary/25 bg-primary/5"
                      : "border-transparent bg-muted/50 hover:border-border hover:bg-card"
                  )}
                  key={summary.id}
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => {
                      setActiveConversationId(summary.id);
                      setShowSidebar(false);
                    }}
                    type="button"
                  >
                    <p className="line-clamp-1 text-[1rem] font-semibold">
                      {summary.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[0.93rem] leading-6 text-muted-foreground">
                      {summary.preview}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[0.76rem] uppercase tracking-[0.2em] text-muted-foreground/85">
                      <span>{formatShortDate(summary.updatedAt)}</span>
                      <span>{summary.messageCount}</span>
                    </div>
                  </button>

                  <div className="mt-3 flex gap-1">
                    <Button
                      className="h-8 px-2.5"
                      onClick={() => {
                        const title = window.prompt("Rename this chat", summary.title);
                        if (!title?.trim()) return;
                        void mutateConversation("rename", {
                          conversationId: summary.id,
                          title,
                        });
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Rename
                    </Button>
                    <Button
                      className="h-8 px-2.5 text-red-600 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        if (!window.confirm("Delete this chat thread?")) return;
                        void mutateConversation("delete", {
                          conversationId: summary.id,
                        });
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {courseSummaries.length} accessible course
              {courseSummaries.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 line-clamp-2">Goals: {initialUser.goals.join(", ")}</p>
          </div>
        </aside>
        )}

        {!isSidebar && showSidebar ? (
          <button
            aria-label="Close sidebar overlay"
            className="absolute inset-0 z-10 bg-black/20 md:hidden"
            onClick={() => setShowSidebar(false)}
            type="button"
          />
        ) : null}

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!isSidebar && (
                    <Button
                      aria-label="Open sidebar"
                      className="md:hidden"
                      onClick={() => setShowSidebar(true)}
                      size="icon"
                      variant="ghost"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-[1.5rem] font-semibold">
                      {activeConversation?.title ?? "Nutrition coach"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {preferences.mode} mode · {preferences.responseStyle} replies
                      · {preferences.strictSourceUse ? " strict sources" : " blended sources"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center gap-2">
                {isSidebar ? (
                  <>
                    <Button
                      aria-label="New chat"
                      onClick={() => {
                        setShowHistory(false);
                        void mutateConversation("create");
                      }}
                      size="icon"
                      variant="ghost"
                      title="New chat"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                      aria-label="Chat history"
                      onClick={() => setShowHistory((current) => !current)}
                      size="icon"
                      variant={showHistory ? "secondary" : "ghost"}
                      title="Chat history"
                    >
                      <History className="h-5 w-5" />
                    </Button>

                    {showHistory ? (
                      <div className="absolute right-0 top-12 z-30 w-[min(22rem,90vw)] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                          <p className="text-sm font-semibold">Previous chats</p>
                          <Button
                            aria-label="Close chat history"
                            className="h-7 w-7"
                            onClick={() => setShowHistory(false)}
                            size="icon"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="scrollbar-subtle max-h-[min(28rem,60vh)] space-y-1.5 overflow-y-auto p-2">
                          {conversationSummaries.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                              No previous chats yet.
                            </p>
                          ) : (
                            conversationSummaries.map((summary) => {
                              const isActive = summary.id === activeConversationId;

                              return (
                                <div
                                  className={cn(
                                    "rounded-2xl border p-3 transition-colors",
                                    isActive
                                      ? "border-primary/25 bg-primary/5"
                                      : "border-transparent hover:border-border hover:bg-muted/50"
                                  )}
                                  key={summary.id}
                                >
                                  <button
                                    className="block w-full text-left"
                                    onClick={() => {
                                      setActiveConversationId(summary.id);
                                      setShowHistory(false);
                                    }}
                                    type="button"
                                  >
                                    <p className="line-clamp-1 text-sm font-semibold">
                                      {summary.title}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                      {summary.preview}
                                    </p>
                                    <div className="mt-1.5 flex items-center justify-between text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                                      <span>{formatShortDate(summary.updatedAt)}</span>
                                      <span>{summary.messageCount} msg</span>
                                    </div>
                                  </button>
                                  <div className="mt-2 flex gap-1">
                                    <Button
                                      className="h-7 px-2 text-xs"
                                      onClick={() => {
                                        const title = window.prompt(
                                          "Rename this chat",
                                          summary.title
                                        );
                                        if (!title?.trim()) return;
                                        void mutateConversation("rename", {
                                          conversationId: summary.id,
                                          title,
                                        });
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      Rename
                                    </Button>
                                    <Button
                                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-600"
                                      onClick={() => {
                                        if (!window.confirm("Delete this chat thread?"))
                                          return;
                                        void mutateConversation("delete", {
                                          conversationId: summary.id,
                                        });
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                <Button
                  aria-label="Export transcript"
                  onClick={exportTranscript}
                  size="icon"
                  variant="ghost"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  aria-label="Clear conversation"
                  onClick={() =>
                    void mutateConversation("clear", {
                      conversationId: activeConversationId,
                    })
                  }
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                  aria-label="Chat settings"
                  onClick={() => setShowSettings((current) => !current)}
                  size="icon"
                  variant={showSettings ? "secondary" : "ghost"}
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
                <Button
                  aria-label="Close disclaimer"
                  onClick={handleClose}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-5 w-5" />
                </Button>

                {showSettings ? (
                  <div className="absolute right-0 top-12 z-30 w-[min(20rem,88vw)] rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-primary/10">
                    <div className="space-y-4">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">Mode</span>
                        <select
                          className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/70"
                          onChange={(event) =>
                            setPreferences((current) => ({
                              ...current,
                              mode: event.target.value as ChatPreferences["mode"],
                            }))
                          }
                          value={preferences.mode}
                        >
                          {chatModeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">Reply style</span>
                        <select
                          className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/70"
                          onChange={(event) =>
                            setPreferences((current) => ({
                              ...current,
                              responseStyle:
                                event.target.value as ChatPreferences["responseStyle"],
                            }))
                          }
                          value={preferences.responseStyle}
                        >
                          {responseStyleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">Tone</span>
                        <select
                          className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/70"
                          onChange={(event) =>
                            setPreferences((current) => ({
                              ...current,
                              tone: event.target.value as ChatPreferences["tone"],
                            }))
                          }
                          value={preferences.tone}
                        >
                          {toneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                        <span className="text-sm font-medium">Strict source mode</span>
                        <input
                          checked={preferences.strictSourceUse}
                          className="h-5 w-5 accent-primary"
                          onChange={(event) =>
                            setPreferences((current) => ({
                              ...current,
                              strictSourceUse: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium">PDF preference</span>
                        <select
                          className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/70"
                          onChange={(event) =>
                            setPreferences((current) => ({
                              ...current,
                              pdfScope: event.target.value as ChatPreferences["pdfScope"],
                            }))
                          }
                          value={preferences.pdfScope}
                        >
                          <option value="blend">Blend with course context</option>
                          <option value="focus">Prefer attached PDF first</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 text-base outline-none focus-visible:ring-4 focus-visible:ring-ring/70"
                onChange={(event) => setActiveCourseId(event.target.value)}
                value={activeCourseId}
              >
                <option value="all">All accessible courses</option>
                {courseSummaries.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} · {course.progressLabel}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                {courseSummaries.length} accessible course
                {courseSummaries.length === 1 ? "" : "s"} ready
              </p>
            </div>
          </header>

          <div
            className="scrollbar-subtle flex-1 overflow-y-auto px-4 py-4 sm:px-5"
            ref={transcriptRef}
          >
            {isLoadingHistory ? (
              <div className="space-y-3">
                <div className="h-20 w-[72%] animate-pulse rounded-3xl bg-muted" />
                <div className="ml-auto h-16 w-[56%] animate-pulse rounded-3xl bg-primary/12" />
                <div className="h-28 w-[80%] animate-pulse rounded-3xl bg-muted" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-full min-h-[20rem] flex-col justify-center rounded-[2rem] border border-dashed border-border bg-muted/35 px-5 py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-7 w-7" />
                </div>
                <h4 className="mt-4 font-heading text-[1.7rem] font-semibold">
                  Ask about lessons, goals, or attached PDFs
                </h4>
                <p className="mx-auto mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
                  Ask questions about your enrolled courses, explore lesson
                  topics, or upload a PDF to get targeted answers.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      className="rounded-full border border-border bg-background px-4 py-2 text-[0.98rem] transition-colors hover:bg-primary/5"
                      key={prompt}
                      onClick={() => setDraft(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant";

                  const isStreaming = streamingId === message.id;
                  const displayContent = isStreaming ? streamingContent : message.content;

                  return (
                    <article
                      className={cn("message-in flex", isAssistant ? "justify-start" : "justify-end")}
                      key={message.id}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] rounded-[1.7rem] border px-4 py-3 sm:max-w-[78%]",
                          isAssistant
                            ? "border-border bg-card"
                            : "border-primary/15 bg-primary text-primary-foreground"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {isAssistant ? (
                              <>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-[1rem] leading-7 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:mb-1 prose-headings:mt-3 prose-strong:font-semibold prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em]">
                                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                                </div>
                                {isStreaming && (
                                  <span className="mt-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-foreground/50" />
                                )}
                              </>
                            ) : (
                              <p className="whitespace-pre-wrap text-[1rem] leading-7">
                                {displayContent}
                              </p>
                            )}
                            <p
                              className={cn(
                                "mt-2 text-[0.75rem] uppercase tracking-[0.24em]",
                                isAssistant
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/75"
                              )}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>

                          {isAssistant ? (
                            <Button
                              aria-label="Copy message"
                              className="h-8 w-8 rounded-full"
                              onClick={() => void copyMessage(message)}
                              size="icon"
                              variant="ghost"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>

                        {message.attachments?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.attachments.map((attachment) => (
                              <span
                                className={cn(
                                  "rounded-full px-3 py-1 text-sm",
                                  isAssistant
                                    ? "bg-muted text-foreground"
                                    : "bg-white/16 text-primary-foreground"
                                )}
                                key={attachment.id}
                              >
                                {attachment.fileName}
                                {attachment.pageCount
                                  ? ` · ${attachment.pageCount} page${attachment.pageCount === 1 ? "" : "s"}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {isAssistant && message.sources?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.sources.map((source) => (
                              <span
                                className="rounded-full border border-border bg-muted/60 px-3 py-1 text-sm text-muted-foreground"
                                key={source.id}
                              >
                                {source.label}
                                {source.detail ? ` · ${source.detail}` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {isAssistant && message.safetyFlags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.safetyFlags.map((flag) => (
                              <span
                                className={cn(
                                  "rounded-full px-3 py-1 text-sm",
                                  flag.severity === "high"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700"
                                )}
                                key={flag.id}
                              >
                                {flag.label}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {isAssistant && message.followUps?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.followUps.map((prompt) => (
                              <button
                                className="rounded-full border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-primary/5"
                                key={prompt}
                                onClick={() => void sendMessage(prompt)}
                                type="button"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {isSending ? (
                  <div className="flex justify-start">
                    <div className="rounded-[1.7rem] border border-border bg-card px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: "160ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: "320ms" }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <footer className="border-t border-border bg-background px-4 py-4 sm:px-5">
            {pendingPdfs.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {pendingPdfs.map((file, index) => (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-sm"
                    key={`${file.name}-${file.size}`}
                  >
                    <Paperclip className="h-4 w-4 text-primary" />
                    <span className="max-w-[14rem] truncate">{file.name}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setPendingPdfs((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index)
                        )
                      }
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="relative">
              <Textarea
                className="min-h-32 resize-none rounded-[1.9rem] px-5 pb-14 pl-14 pr-24"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask about lessons, action steps, or attach PDFs..."
                value={draft}
              />

              <input
                accept="application/pdf,.pdf"
                className="hidden"
                multiple
                onChange={onSelectPdfs}
                ref={fileInputRef}
                type="file"
              />

              <Button
                aria-label="Attach PDF"
                className="absolute bottom-4 left-4 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                variant="ghost"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              <Button
                className="absolute bottom-4 right-4 rounded-full px-4"
                disabled={isSending}
                onClick={() => void sendMessage()}
              >
                <ArrowUp className="h-5 w-5" />
                Send
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Shift+Enter for a new line. Attach up to 3 PDFs.
              </p>
              <div className="flex items-center gap-2 text-sm">
                {copiedId ? <span className="text-primary">Copied answer.</span> : null}
                {status ? (
                  <span
                    className={cn(
                      status.tone === "error" ? "text-red-600" : "text-primary"
                    )}
                  >
                    {status.text}
                  </span>
                ) : latestAssistant?.sources?.length ? (
                  <span className="text-muted-foreground">
                    Latest answer used {latestAssistant.sources.length} source
                    {latestAssistant.sources.length === 1 ? "" : "s"}.
                  </span>
                ) : null}
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
