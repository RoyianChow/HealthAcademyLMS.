import type {
  ChatMode,
  ChatPreferences,
  ChatResponseStyle,
  ChatTone,
} from "@/lib/chat/types";

export const defaultChatPreferences: ChatPreferences = {
  mode: "coach",
  responseStyle: "balanced",
  tone: "supportive",
  strictSourceUse: false,
  pdfScope: "blend",
};

export const chatModeOptions: Array<{
  value: ChatMode;
  label: string;
  description: string;
}> = [
  {
    value: "coach",
    label: "Coach",
    description: "Practical habit-building guidance and next steps.",
  },
  {
    value: "study",
    label: "Study",
    description: "Lesson-focused explanations, checks, and quiz-friendly answers.",
  },
  {
    value: "quick",
    label: "Quick",
    description: "Fast, stripped-down answers without extra framing.",
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Heavier emphasis on attached PDF material for the current turn.",
  },
];

export const responseStyleOptions: Array<{
  value: ChatResponseStyle;
  label: string;
}> = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

export const toneOptions: Array<{
  value: ChatTone;
  label: string;
}> = [
  { value: "supportive", label: "Supportive" },
  { value: "direct", label: "Direct" },
  { value: "study", label: "Study" },
];
