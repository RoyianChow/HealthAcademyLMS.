import "server-only";

import { getChatConfig } from "@/lib/chat/config";
import type { AttachedPdfContext, RelevantCourseExcerpt } from "@/lib/chat/types";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GenerateReplyInput = {
  messages: OpenAIMessage[];
  question: string;
  relevantExcerpts: RelevantCourseExcerpt[];
  attachedPdfs: AttachedPdfContext[];
  strictSourceUse: boolean;
};

export async function generateNutritionReply(input: GenerateReplyInput) {
  const { openAiApiKey, openAiModel } = await getChatConfig();

  if (!openAiApiKey) {
    return buildFallbackReply(input);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        messages: input.messages,
        max_tokens: 260,
        temperature: 0.35,
      }),
    });

    if (!response.ok) {
      return buildFallbackReply(input);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const reply = payload.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return buildFallbackReply(input);
    }

    return trimWords(reply, 130);
  } catch {
    return buildFallbackReply(input);
  }
}

function buildFallbackReply(input: GenerateReplyInput) {
  if (input.attachedPdfs.length > 0) {
    const firstPdf = input.attachedPdfs[0];
    const excerpt = trimWords(firstPdf.extractedText, 36);

    if (/summar|takeaway|key point|main point/i.test(input.question)) {
      return trimWords(
        `From ${firstPdf.fileName}, the clearest text I could read is: ${excerpt} That is the strongest PDF-backed answer I have right now.`,
        130
      );
    }

    return trimWords(
      `The attached PDF ${firstPdf.fileName} includes text such as: ${excerpt} If you want, I can summarize it, pull out key points, or answer more narrowly from only the PDF.`,
      130
    );
  }

  const bestMatch = input.relevantExcerpts[0];

  if (bestMatch) {
    const location = [bestMatch.courseTitle, bestMatch.lessonTitle]
      .filter(Boolean)
      .join(" - ");

    return trimWords(
      `The strongest match in your accessible content is ${location}. ${bestMatch.excerpt} Use that as your next checkpoint, and if you want, ask for action steps, a simpler explanation, or a quick quiz.`,
      130
    );
  }

  if (input.strictSourceUse) {
    return trimWords(
      "I do not have a strong enough match in the provided course or PDF sources to answer that confidently. Try attaching a PDF, focusing on one course, or asking about a lesson topic that exists in the available material.",
      130
    );
  }

  return trimWords(
    "I can help with the nutrition courses available to this user, but I do not have a strong source match for that question yet. Try asking about meal planning, protein balance, hydration, gut health, or workout fueling for a more targeted answer.",
    130
  );
}

function trimWords(text: string, limit: number) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= limit) {
    return text;
  }

  return `${words.slice(0, limit).join(" ")}...`;
}
