import type {
  AttachedPdfContext,
  ChatCourse,
  ChatMessage,
  ChatPreferences,
  ChatRuntimeContext,
  RelevantCourseExcerpt,
} from "@/lib/chat/types";

export function buildChatMessages(params: {
  context: ChatRuntimeContext;
  question: string;
  history: ChatMessage[];
  relevantExcerpts: RelevantCourseExcerpt[];
  attachedPdfs: AttachedPdfContext[];
  safetyPromptBlock: string;
}) {
  const systemPrompt = buildSystemPrompt({
    context: params.context,
    relevantExcerpts: params.relevantExcerpts,
    attachedPdfs: params.attachedPdfs,
    safetyPromptBlock: params.safetyPromptBlock,
  });

  return [
    { role: "system" as const, content: systemPrompt },
    ...params.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user" as const,
      content: buildUserTurn(params.question, params.attachedPdfs),
    },
  ];
}

function buildSystemPrompt(params: {
  context: ChatRuntimeContext;
  relevantExcerpts: RelevantCourseExcerpt[];
  attachedPdfs: AttachedPdfContext[];
  safetyPromptBlock: string;
}) {
  const { user, accessibleCourses, activeCourseId, preferences } = params.context;
  const activeCourse = activeCourseId
    ? accessibleCourses.find((course) => course.id === activeCourseId) ?? null
    : null;

  return [
    "You are Nutrition Coach for Health Academy.",
    "You are an educational assistant, not a medical professional.",
    "Do not present your replies as medical advice, diagnosis, or treatment.",
    "When a user needs personalized medical guidance, recommend a qualified clinician, registered dietitian, or functional medicine practitioner.",
    "Stay warm, accurate, and grounded in the supplied user context, course context, and any attached PDF text.",
    buildStyleInstruction(preferences),
    buildModeInstruction(preferences),
    buildSourceInstruction(preferences),
    "When source-backed material is available, answer from it rather than inventing new specifics.",
    params.safetyPromptBlock,
    "",
    formatUserBlock(user),
    "",
    formatCourseBlock(accessibleCourses, activeCourse, preferences),
    "",
    formatRelevantExcerptBlock(params.relevantExcerpts),
    "",
    formatAttachedPdfBlock(params.attachedPdfs),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildStyleInstruction(preferences: ChatPreferences) {
  const styleLine =
    preferences.responseStyle === "concise"
      ? "Keep responses to the point and usually under 60 words."
      : preferences.responseStyle === "detailed"
        ? "Provide fuller explanations with practical detail when useful, but stay readable."
        : "Use balanced replies with enough context to be helpful without rambling.";

  const toneLine =
    preferences.tone === "direct"
      ? "Use a direct, efficient tone."
      : preferences.tone === "study"
        ? "Use a teaching tone that supports learning and recall."
        : "Use a supportive coaching tone.";

  return `${styleLine} ${toneLine}`;
}

function buildModeInstruction(preferences: ChatPreferences) {
  if (preferences.mode === "study") {
    return "Study mode: teach clearly, connect concepts, and make ideas easier to remember.";
  }

  if (preferences.mode === "quick") {
    return "Quick mode: prioritize the shortest useful answer first.";
  }

  if (preferences.mode === "pdf") {
    return "PDF mode: prioritize attached PDF material above course context whenever a PDF is available.";
  }

  return "Coach mode: emphasize practical next steps, realistic habits, and encouragement.";
}

function buildSourceInstruction(preferences: ChatPreferences) {
  if (preferences.strictSourceUse) {
    return "Strict source mode is on. If the provided PDFs or course excerpts do not support an answer, say so plainly instead of filling gaps.";
  }

  if (preferences.pdfScope === "focus") {
    return "PDF focus is on. Prefer the attached PDF material first, then use course context if the PDF does not cover the question.";
  }

  return "Blend the strongest available sources across course context and attached PDFs when it helps the user.";
}

function formatUserBlock(user: ChatRuntimeContext["user"]) {
  return [
    "Current user context:",
    `- Name: ${user.name}`,
    `- Goals: ${user.goals.join(", ")}`,
    `- Dietary focus: ${user.dietaryFocus.join(", ")}`,
    user.notes ? `- Notes: ${user.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatCourseBlock(
  accessibleCourses: ChatCourse[],
  activeCourse: ChatCourse | null,
  preferences: ChatPreferences
) {
  const lines = accessibleCourses.map((course) => {
    const progress = course.progress
      ? `${course.progress.percentage}% complete`
      : "no progress data";

    return `- ${course.title} (${course.category}, ${progress})`;
  });

  return [
    "Accessible courses:",
    ...lines,
    activeCourse
      ? `Active course focus: ${activeCourse.title}`
      : "Active course focus: all accessible courses",
    `PDF source preference: ${preferences.pdfScope}`,
  ].join("\n");
}

function formatRelevantExcerptBlock(relevantExcerpts: RelevantCourseExcerpt[]) {
  if (relevantExcerpts.length === 0) {
    return "Relevant course excerpts: none matched strongly.";
  }

  return [
    "Relevant course excerpts:",
    ...relevantExcerpts.map((excerpt) => {
      const location = [excerpt.courseTitle, excerpt.chapterTitle, excerpt.lessonTitle]
        .filter(Boolean)
        .join(" > ");

      return `- ${location}: ${excerpt.excerpt}`;
    }),
  ].join("\n");
}

function formatAttachedPdfBlock(attachedPdfs: AttachedPdfContext[]) {
  if (attachedPdfs.length === 0) {
    return "Attached PDFs: none.";
  }

  return [
    "Attached PDF context:",
    ...attachedPdfs.map(
      (pdf) =>
        `- ${pdf.fileName} (${pdf.pageCount} pages${pdf.truncated ? ", truncated excerpt" : ""}): ${pdf.excerptPreview}`
    ),
  ].join("\n");
}

function buildUserTurn(question: string, attachedPdfs: AttachedPdfContext[]) {
  if (attachedPdfs.length === 0) {
    return question;
  }

  return [
    `Question: ${question}`,
    "",
    ...attachedPdfs.flatMap((pdf) => [
      `Attached PDF text from ${pdf.fileName}:`,
      pdf.extractedText,
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}
