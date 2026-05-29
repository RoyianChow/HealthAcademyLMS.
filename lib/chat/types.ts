export type ChatRole = "user" | "assistant";

export type ChatMode = "coach" | "study" | "quick" | "pdf";
export type ChatResponseStyle = "concise" | "balanced" | "detailed";
export type ChatTone = "supportive" | "direct" | "study";
export type ChatPdfScope = "blend" | "focus";

export type ChatCourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ChatCourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ChatSourceKind = "lesson" | "course" | "pdf" | "general" | "safety";
export type ChatSafetySeverity = "medium" | "high";

export type ChatSourceBadge = {
  id: string;
  kind: ChatSourceKind;
  label: string;
  detail?: string;
};

export type ChatAttachment = {
  id: string;
  kind: "pdf";
  fileName: string;
  pageCount?: number;
  truncated?: boolean;
  sizeLabel?: string;
  excerptPreview?: string;
};

export type ChatSafetyFlag = {
  id: string;
  label: string;
  severity: ChatSafetySeverity;
  note: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: ChatSourceBadge[];
  attachments?: ChatAttachment[];
  followUps?: string[];
  mode?: ChatMode;
  responseStyle?: ChatResponseStyle;
  safetyFlags?: ChatSafetyFlag[];
};

export type ChatPreferences = {
  mode: ChatMode;
  responseStyle: ChatResponseStyle;
  tone: ChatTone;
  strictSourceUse: boolean;
  pdfScope: ChatPdfScope;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isAutoTitle: boolean;
};

export type ChatUserContext = {
  id: string;
  name: string;
  email: string;
  goals: string[];
  dietaryFocus: string[];
  enrolledCourseIds: string[];
  notes?: string;
};

export type ChatCourseLesson = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
};

export type ChatCourseChapter = {
  id: string;
  title: string;
  position: number;
  lessons: ChatCourseLesson[];
};

export type ChatCourseProgress = {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
};

export type ChatCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  smallDescription: string;
  category: string;
  level: ChatCourseLevel;
  duration: number;
  status: ChatCourseStatus;
  progress?: ChatCourseProgress;
  searchableTerms?: string[];
  chapters: ChatCourseChapter[];
};

export type ChatBootstrapCourseSummary = {
  id: string;
  title: string;
  progressLabel: string;
};

export type ChatBootstrap = {
  user: ChatUserContext;
  courseSummaries: ChatBootstrapCourseSummary[];
  conversationSummaries: ChatConversationSummary[];
  initialConversationId: string;
};

export type ChatRuntimeContext = {
  user: ChatUserContext;
  accessibleCourses: ChatCourse[];
  activeCourseId: string | null;
  conversationId: string;
  preferences: ChatPreferences;
};

export type ChatHistoryResponse = {
  messages: ChatMessage[];
};

export type ChatPostResponse = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  conversationSummary: ChatConversationSummary;
  error?: string;
};

export type ChatConversationsResponse = {
  summaries: ChatConversationSummary[];
  activeConversationId: string;
  conversation?: ChatConversationSummary;
  error?: string;
};

export type AttachedPdfContext = {
  id: string;
  fileName: string;
  extractedText: string;
  pageCount: number;
  truncated: boolean;
  sizeBytes: number;
  excerptPreview: string;
};

export type RelevantCourseExcerpt = {
  courseId: string;
  courseTitle: string;
  chapterTitle?: string;
  lessonTitle?: string;
  excerpt: string;
  score: number;
};

export type StoredConversation = ChatConversationSummary & {
  userId: string;
  messages: ChatMessage[];
};
