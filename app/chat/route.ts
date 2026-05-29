import { NextResponse } from "next/server";
import { z } from "zod";
import { defaultChatPreferences } from "@/lib/chat/defaults";
import {
  findRelevantCourseExcerpts,
  getAccessibleCoursesForUser,
} from "@/lib/chat/course-context";
import { generateNutritionReply } from "@/lib/chat/openai";
import { extractPdfContexts } from "@/lib/chat/pdf";
import { buildChatMessages } from "@/lib/chat/prompt";
import {
  buildAssistantSources,
  buildFollowUpSuggestions,
  buildUserAttachments,
} from "@/lib/chat/response-meta";
import { applySafetyPostProcessing, analyzeSafety } from "@/lib/chat/safety";
import { appendConversationTurn, getConversationMessages } from "@/lib/chat/store";
import type { ChatPreferences } from "@/lib/chat/types";
import { resolveChatUserContext } from "@/lib/chat/user-context";

export const runtime = "nodejs";

const modeSchema = z.enum(["coach", "study", "quick", "pdf"]);
const responseStyleSchema = z.enum(["concise", "balanced", "detailed"]);
const toneSchema = z.enum(["supportive", "direct", "study"]);
const pdfScopeSchema = z.enum(["blend", "focus"]);

const chatRequestSchema = z.object({
  message: z.string().trim().max(1000),
  userId: z.string().optional(),
  activeCourseId: z.string().nullable().optional(),
  conversationId: z.string().min(1),
  mode: modeSchema.optional(),
  responseStyle: responseStyleSchema.optional(),
  tone: toneSchema.optional(),
  strictSourceUse: z.boolean().optional(),
  pdfScope: pdfScopeSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const { body, uploadedPdfs } = await parseRequest(request);

    if (!body.message && uploadedPdfs.length === 0) {
      throw new Error("Please enter a message or attach a PDF.");
    }

    const preferences = resolvePreferences(body);
    const effectiveQuestion =
      body.message || "Please use the attached PDFs as context for this question.";

    const user = await resolveChatUserContext(body.userId);
    const accessibleCourses = await getAccessibleCoursesForUser(user);
    const attachedPdfs =
      uploadedPdfs.length > 0 ? await extractPdfContexts(uploadedPdfs) : [];
    const history = await getConversationMessages({
      userId: user.id,
      conversationId: body.conversationId,
    });
    const safety = analyzeSafety(effectiveQuestion);

    const relevantExcerpts = findRelevantCourseExcerpts({
      question: effectiveQuestion,
      accessibleCourses,
      activeCourseId: body.activeCourseId ?? null,
    });

    const messages = buildChatMessages({
      context: {
        user,
        accessibleCourses,
        activeCourseId: body.activeCourseId ?? null,
        conversationId: body.conversationId,
        preferences,
      },
      question: effectiveQuestion,
      history,
      relevantExcerpts,
      attachedPdfs,
      safetyPromptBlock: safety.promptBlock,
    });

    const assistantReply = safety.overrideReply
      ? safety.overrideReply
      : applySafetyPostProcessing(
          await generateNutritionReply({
            messages,
            question: effectiveQuestion,
            relevantExcerpts,
            attachedPdfs,
            strictSourceUse: preferences.strictSourceUse,
          }),
          safety.flags
        );

    const storedTurn = await appendConversationTurn({
      userId: user.id,
      conversationId: body.conversationId,
      userMessage: buildStoredUserMessage({
        attachedPdfs,
        message: effectiveQuestion,
      }),
      userAttachments: buildUserAttachments(attachedPdfs),
      assistantMessage: assistantReply,
      assistantSources: buildAssistantSources({
        relevantExcerpts,
        attachedPdfs,
        safetyFlags: safety.flags,
        strictSourceUse: preferences.strictSourceUse,
      }),
      assistantFollowUps: buildFollowUpSuggestions({
        mode: preferences.mode,
        attachedPdfs,
        safetyFlags: safety.flags,
      }),
      mode: preferences.mode,
      responseStyle: preferences.responseStyle,
      safetyFlags: safety.flags,
    });

    return NextResponse.json(storedTurn);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unable to process the chat message.";

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const uploadedPdfs = formData
      .getAll("pdf")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const body = chatRequestSchema.parse({
      message: formData.get("message") ?? "",
      userId: formData.get("userId") ?? undefined,
      activeCourseId:
        formData.get("activeCourseId") === "all"
          ? null
          : formData.get("activeCourseId") ?? undefined,
      conversationId: formData.get("conversationId") ?? undefined,
      mode: formData.get("mode") ?? undefined,
      responseStyle: formData.get("responseStyle") ?? undefined,
      tone: formData.get("tone") ?? undefined,
      strictSourceUse: toBoolean(formData.get("strictSourceUse")),
      pdfScope: formData.get("pdfScope") ?? undefined,
    });

    return { body, uploadedPdfs };
  }

  return {
    body: chatRequestSchema.parse(await request.json()),
    uploadedPdfs: [] as File[],
  };
}

function resolvePreferences(body: Partial<ChatPreferences>) {
  return {
    mode: body.mode ?? defaultChatPreferences.mode,
    responseStyle: body.responseStyle ?? defaultChatPreferences.responseStyle,
    tone: body.tone ?? defaultChatPreferences.tone,
    strictSourceUse:
      body.strictSourceUse ?? defaultChatPreferences.strictSourceUse,
    pdfScope: body.pdfScope ?? defaultChatPreferences.pdfScope,
  } satisfies ChatPreferences;
}

function buildStoredUserMessage(params: {
  message: string;
  attachedPdfs: Array<{ fileName: string }>;
}) {
  if (params.attachedPdfs.length === 0) {
    return params.message;
  }

  const fileNames = params.attachedPdfs.map((pdf) => pdf.fileName).join(", ");

  return [`[Attached PDFs: ${fileNames}]`, params.message]
    .filter(Boolean)
    .join("\n");
}

function toBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}
