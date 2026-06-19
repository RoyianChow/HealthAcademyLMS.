export const QuestionType = {
  single: "single",
  multiple: "multiple",
  essay: "essay",
  assessment: "assessment",
} as const;

export type QuestionType =
  (typeof QuestionType)[keyof typeof QuestionType];
