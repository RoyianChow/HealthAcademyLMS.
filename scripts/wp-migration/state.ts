import { Annotation } from "@langchain/langgraph";

// ─── WordPress API types ────────────────────────────────────────────────────

export interface WPRenderedField {
  rendered: string;
}

export interface WPCourse {
  id: number;
  title: WPRenderedField;
  slug: string;
  status: string;
  link: string;
  price_type?: string;
  price_type_paynow_price?: string;
  content?: WPRenderedField;
}

export interface WPLesson {
  id: number;
  title: WPRenderedField;
  content: WPRenderedField;
  status: string;
  link: string;
}

export interface WPTopic {
  id: number;
  title: WPRenderedField;
  content: WPRenderedField;
  status: string;
  link: string;
}

export interface WPQuiz {
  id: number;
  title: WPRenderedField;
  content?: WPRenderedField;
  status: string;
  link: string;
}

export interface WPQuestionAnswer {
  _answer: string;
  _correct: boolean;
  _points: number;
  _html: boolean;
}

export type WPQuestionType =
  | "single"
  | "multiple"
  | "essay"
  | "assessment_answer"
  | string;

export interface WPQuestion {
  id: number;
  title: WPRenderedField;
  content: WPRenderedField;
  question_type: WPQuestionType;
  menu_order: number;
  answers: WPQuestionAnswer[];
  correct_message?: string;
  incorrect_message?: string;
  /** Parent quiz ID — present on most LearnDash question records */
  quiz?: number;
}

export interface StepsTopicNode {
  "sfwd-quiz": Record<string, unknown[]>;
}

export interface StepsLessonNode {
  "sfwd-topic": Record<string, StepsTopicNode>;
  "sfwd-quiz": Record<string, unknown[]>;
}

export interface StepsTree {
  h: {
    "sfwd-lessons": Record<string, StepsLessonNode>;
    "sfwd-quiz": Record<string, unknown[]>;
  };
}

export interface ActivityClassification {
  isReactCDN: boolean;
  hasFlashcard: boolean;
  hasMultipleChoice: boolean;
  hasDragDrop: boolean;
  hasSelectAll: boolean;
  hasFillBlank: boolean;
}

export interface InteractiveTopicMeta {
  topicId: number;
  title: string;
  classification: ActivityClassification;
  isStorable: boolean;
}

// ─── Migration state types ──────────────────────────────────────────────────

export interface MediaRef {
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface LogEntry {
  phase: string;
  message: string;
  timestamp: string;
}

export interface MigrationStats {
  coursesCreated: number;
  chaptersCreated: number;
  lessonsCreated: number;
  quizzesCreated: number;
  questionsCreated: number;
  optionsCreated: number;
  videosCreated: number;
  documentsCreated: number;
  pdfsUploaded: number;
  mp4sUploaded: number;
  totalBytesUploaded: number;
}

// ─── LangGraph state annotation ───────────────────────────────────────────────

function replaceReducer<T>(_: T, next: T): T {
  return next;
}

function appendReducer<T>(prev: T[], next: T[]): T[] {
  return [...prev, ...next];
}

function mergeRecordReducer<K extends string | number, V>(
  prev: Record<K, V>,
  next: Record<K, V>
): Record<K, V> {
  return { ...prev, ...next };
}

export const MigrationAnnotation = Annotation.Root({
  jwtToken: Annotation<string>({
    reducer: replaceReducer,
    default: () => "",
  }),
  wpCourses: Annotation<WPCourse[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  wpStepTrees: Annotation<Record<number, StepsTree>>({
    reducer: replaceReducer,
    default: () => ({}),
  }),
  wpLessons: Annotation<WPLesson[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  wpTopics: Annotation<WPTopic[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  wpQuizzes: Annotation<WPQuiz[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  wpQuestions: Annotation<WPQuestion[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  interactiveTopics: Annotation<InteractiveTopicMeta[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  skippedQuestions: Annotation<WPQuestion[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  mediaQueue: Annotation<string[]>({
    reducer: replaceReducer,
    default: () => [],
  }),
  mediaMap: Annotation<Record<string, MediaRef>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  stripeMap: Annotation<Record<number, string>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  courseMap: Annotation<Record<number, string>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  chapterMap: Annotation<Record<number, string>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  lessonMap: Annotation<Record<number, string>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  quizMap: Annotation<Record<number, string>>({
    reducer: mergeRecordReducer,
    default: () => ({}),
  }),
  gate1Proceed: Annotation<boolean>({
    reducer: replaceReducer,
    default: () => false,
  }),
  migrationStats: Annotation<MigrationStats>({
    reducer: replaceReducer,
    default: () => ({
      coursesCreated: 0,
      chaptersCreated: 0,
      lessonsCreated: 0,
      quizzesCreated: 0,
      questionsCreated: 0,
      optionsCreated: 0,
      videosCreated: 0,
      documentsCreated: 0,
      pdfsUploaded: 0,
      mp4sUploaded: 0,
      totalBytesUploaded: 0,
    }),
  }),
  errors: Annotation<string[]>({
    reducer: appendReducer,
    default: () => [],
  }),
  migrationLog: Annotation<LogEntry[]>({
    reducer: appendReducer,
    default: () => [],
  }),
});

export type MigrationState = typeof MigrationAnnotation.State;
