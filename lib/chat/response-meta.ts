import type {
  AttachedPdfContext,
  ChatAttachment,
  ChatMode,
  ChatSafetyFlag,
  ChatSourceBadge,
  RelevantCourseExcerpt,
} from "@/lib/chat/types";

export function buildAssistantSources(params: {
  relevantExcerpts: RelevantCourseExcerpt[];
  attachedPdfs: AttachedPdfContext[];
  strictSourceUse: boolean;
  safetyFlags: ChatSafetyFlag[];
}) {
  const badges: ChatSourceBadge[] = [];

  for (const pdf of params.attachedPdfs.slice(0, 2)) {
    badges.push({
      id: `pdf:${pdf.fileName}`,
      kind: "pdf",
      label: pdf.fileName,
      detail: `${pdf.pageCount} page${pdf.pageCount === 1 ? "" : "s"}`,
    });
  }

  for (const excerpt of params.relevantExcerpts.slice(0, 2)) {
    badges.push({
      id: excerpt.lessonTitle
        ? `lesson:${excerpt.courseId}:${excerpt.lessonTitle}`
        : `course:${excerpt.courseId}`,
      kind: excerpt.lessonTitle ? "lesson" : "course",
      label: excerpt.lessonTitle ?? excerpt.courseTitle,
      detail: excerpt.lessonTitle ? excerpt.courseTitle : "Course context",
    });
  }

  if (badges.length === 0) {
    badges.push({
      id: params.strictSourceUse ? "no-source-match" : "general-guidance",
      kind: "general",
      label: params.strictSourceUse ? "No direct source match" : "General guidance",
      detail: params.strictSourceUse
        ? "Strict source mode is on"
        : "No matching course lesson or PDF",
    });
  }

  if (params.safetyFlags.length > 0) {
    badges.push({
      id: "safety-guardrail",
      kind: "safety",
      label: "Safety guardrail",
      detail:
        params.safetyFlags.some((flag) => flag.severity === "high")
          ? "Urgent response applied"
          : "Clinical reminder added",
    });
  }

  return dedupeBadges(badges);
}

export function buildUserAttachments(attachedPdfs: AttachedPdfContext[]): ChatAttachment[] {
  return attachedPdfs.map((pdf) => ({
    id: pdf.id,
    kind: "pdf",
    fileName: pdf.fileName,
    pageCount: pdf.pageCount,
    truncated: pdf.truncated,
    sizeLabel: formatBytes(pdf.sizeBytes),
    excerptPreview: pdf.excerptPreview,
  }));
}

export function buildFollowUpSuggestions(params: {
  mode: ChatMode;
  attachedPdfs: AttachedPdfContext[];
  safetyFlags: ChatSafetyFlag[];
}) {
  const suggestions: string[] = [];

  if (params.attachedPdfs.length > 0) {
    suggestions.push(
      "Summarize the PDF in 3 bullets.",
      "Tell me the biggest takeaway from the PDF.",
      "Answer only from the attached PDF."
    );
  }

  if (params.mode === "coach") {
    suggestions.push(
      "Turn that into action steps.",
      "Give me a one-day example.",
      "What should I focus on this week?"
    );
  }

  if (params.mode === "study") {
    suggestions.push(
      "Quiz me on this.",
      "Make 3 flashcards from that.",
      "Explain it more simply."
    );
  }

  if (params.mode === "quick") {
    suggestions.push(
      "Make that shorter.",
      "Give me the top 3 points.",
      "What matters most here?"
    );
  }

  if (params.mode === "pdf") {
    suggestions.push(
      "Pull out the key facts from the PDF.",
      "Which part of the PDF matters most?",
      "Give me a plain-language PDF summary."
    );
  }

  if (params.safetyFlags.length > 0) {
    suggestions.push(
      "What should I ask a clinician about this?",
      "Keep this extra cautious and general.",
      "What is the safest next step?"
    );
  }

  return Array.from(new Set(suggestions)).slice(0, 3);
}

function dedupeBadges(badges: ChatSourceBadge[]) {
  const seen = new Set<string>();

  return badges.filter((badge) => {
    if (seen.has(badge.id)) {
      return false;
    }

    seen.add(badge.id);
    return true;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
