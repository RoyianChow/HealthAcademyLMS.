import type { ChatSafetyFlag } from "@/lib/chat/types";

type SafetyRule = {
  id: string;
  label: string;
  severity: ChatSafetyFlag["severity"];
  note: string;
  pattern: RegExp;
};

type ChatSafetyAnalysis = {
  flags: ChatSafetyFlag[];
  promptBlock: string;
  overrideReply?: string;
};

const urgentRules: SafetyRule[] = [
  {
    id: "breathing",
    label: "Breathing difficulty",
    severity: "high",
    note: "Possible urgent symptom language detected.",
    pattern: /trouble breathing|can't breathe|cannot breathe|stopped breathing/i,
  },
  {
    id: "chest-pain",
    label: "Chest pain or collapse",
    severity: "high",
    note: "Possible emergency symptom language detected.",
    pattern: /chest pain|passed out|passing out|fainted|fainting|unresponsive|seizure/i,
  },
  {
    id: "self-harm",
    label: "Crisis language",
    severity: "high",
    note: "Possible mental health crisis language detected.",
    pattern: /suicidal|self-harm|hurt myself|kill myself/i,
  },
];

const cautionRules: SafetyRule[] = [
  {
    id: "pregnancy",
    label: "Pregnancy or breastfeeding",
    severity: "medium",
    note: "Keep nutrition guidance general and clinician-aware.",
    pattern: /pregnan|breastfeed|nursing\b/i,
  },
  {
    id: "medication",
    label: "Medication",
    severity: "medium",
    note: "Avoid medication-specific nutrition instructions.",
    pattern: /medication|medicine|insulin|blood thinner|metformin/i,
  },
  {
    id: "medical-condition",
    label: "Medical condition",
    severity: "medium",
    note: "Avoid disease-specific treatment advice.",
    pattern: /diabetes|kidney disease|liver disease|ibd|crohn|ulcerative colitis|hypertension/i,
  },
  {
    id: "allergy",
    label: "Allergy or intolerance",
    severity: "medium",
    note: "Avoid risky food recommendations.",
    pattern: /allergy|allergic|anaphylaxis|celiac|gluten intolerance/i,
  },
  {
    id: "eating-disorder",
    label: "Eating disorder language",
    severity: "medium",
    note: "Avoid reinforcing disordered eating behavior.",
    pattern: /anorexia|bulimia|purging|binge eating|eating disorder/i,
  },
  {
    id: "child",
    label: "Child or infant nutrition",
    severity: "medium",
    note: "Keep age-specific guidance general.",
    pattern: /toddler|infant|baby|child nutrition|kid nutrition/i,
  },
];

export function analyzeSafety(question: string): ChatSafetyAnalysis {
  const urgentFlags = matchRules(question, urgentRules);

  if (urgentFlags.length > 0) {
    return {
      flags: urgentFlags,
      promptBlock: buildPromptBlock(urgentFlags),
      overrideReply:
        "This sounds like something that should not rely on a chatbot alone. If this is happening now, contact emergency services or urgent medical care right away. I can still help with general nutrition learning once the urgent issue is handled.",
    };
  }

  const cautionFlags = matchRules(question, cautionRules);

  return {
    flags: cautionFlags,
    promptBlock: buildPromptBlock(cautionFlags),
  };
}

export function applySafetyPostProcessing(reply: string, flags: ChatSafetyFlag[]) {
  if (flags.length === 0) {
    return reply;
  }

  const hasClinicalReminder =
    /doctor|dietitian|clinician|medical professional|functional medicine practitioner/i.test(
      reply
    );

  if (hasClinicalReminder) {
    return reply;
  }

  return `${reply}\n\nBecause this touches on ${flags
    .map((flag) => flag.label.toLowerCase())
    .join(
      ", "
    )}, keep this general and check with a qualified clinician, registered dietitian, or functional medicine practitioner for personalized advice.`;
}

function matchRules(question: string, rules: SafetyRule[]) {
  return rules
    .filter((rule) => rule.pattern.test(question))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      severity: rule.severity,
      note: rule.note,
    }));
}

function buildPromptBlock(flags: ChatSafetyFlag[]) {
  const sharedRules = [
    "Safety rules:",
    "- Never diagnose, prescribe, or claim certainty about symptoms.",
    "- For pregnancy, medications, allergies, medical conditions, or eating disorder language, keep advice general and recommend qualified professional support such as a clinician, registered dietitian, or functional medicine practitioner.",
    "- If wording sounds urgent or dangerous, direct the user to emergency or urgent medical support.",
  ];

  if (flags.length === 0) {
    return sharedRules.join("\n");
  }

  return [
    ...sharedRules,
    ...flags.map((flag) => `- Active guardrail: ${flag.label}. ${flag.note}`),
  ].join("\n");
}
