import { NextResponse } from "next/server";
import { z } from "zod";
import { defaultChatPreferences } from "@/lib/chat/defaults";
import {
  chatPostLimiter,
  enforceChatRateLimit,
} from "@/lib/chat/arcjet";
import {
  findRelevantCourseExcerpts,
  getAccessibleCoursesForUser,
} from "@/lib/chat/course-context";
import { generateNutritionReply, streamNutritionReply } from "@/lib/chat/openai";
import { extractPdfContexts } from "@/lib/chat/pdf";
import { buildChatMessages } from "@/lib/chat/prompt";
import {
  buildAssistantSources,
  buildFollowUpSuggestions,
  buildUserAttachments,
} from "@/lib/chat/response-meta";
import { applySafetyPostProcessing, analyzeSafety } from "@/lib/chat/safety";
import { appendConversationTurn, getConversationContext } from "@/lib/chat/store";
import type { ChatPreferences } from "@/lib/chat/types";
import { resolveChatUserContext } from "@/lib/chat/user-context";
import { requireUser } from "@/app/data/user/require-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const modeSchema = z.enum(["coach", "study", "quick", "pdf"]);
const responseStyleSchema = z.enum(["concise", "balanced", "detailed"]);
const toneSchema = z.enum(["supportive", "direct", "study"]);
const pdfScopeSchema = z.enum(["blend", "focus"]);

const chatRequestSchema = z.object({
  message: z.string().trim().max(1000),
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
    const sessionUser = await requireUser();
    const rateLimit = await enforceChatRateLimit(
      request,
      sessionUser.id,
      chatPostLimiter
    );
    if (rateLimit.denied) {
      return rateLimit.response;
    }

    const { body, uploadedPdfs } = await parseRequest(request);

    if (!body.message && uploadedPdfs.length === 0) {
      throw new Error("Please enter a message or attach a PDF.");
    }

    const preferences = resolvePreferences(body);
    const effectiveQuestion =
      body.message || "Please use the attached PDFs as context for this question.";

    const user = await resolveChatUserContext(sessionUser.id);
    const accessibleCourses = await getAccessibleCoursesForUser(user);
    const attachedPdfs =
      uploadedPdfs.length > 0 ? await extractPdfContexts(uploadedPdfs) : [];
    const { recentMessages, earlierSummary } = await getConversationContext({
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
      history: recentMessages,
      conversationSummary: earlierSummary,
      relevantExcerpts,
      attachedPdfs,
      safetyPromptBlock: safety.promptBlock,
    });

    const storedUserMessage = buildStoredUserMessage({
      attachedPdfs,
      message: effectiveQuestion,
    });
    const userAttachments = buildUserAttachments(attachedPdfs);
    const assistantSources = buildAssistantSources({
      relevantExcerpts,
      attachedPdfs,
      safetyFlags: safety.flags,
      strictSourceUse: preferences.strictSourceUse,
    });
    const assistantFollowUps = buildFollowUpSuggestions({
      mode: preferences.mode,
      attachedPdfs,
      safetyFlags: safety.flags,
    });

    if (safety.overrideReply) {
      const storedTurn = await appendConversationTurn({
        userId: user.id,
        conversationId: body.conversationId,
        userMessage: storedUserMessage,
        userAttachments,
        assistantMessage: safety.overrideReply,
        assistantSources,
        assistantFollowUps,
        mode: preferences.mode,
        responseStyle: preferences.responseStyle,
        safetyFlags: safety.flags,
      });

      return NextResponse.json(storedTurn);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: object) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          let assistantReply = "";

          for await (const chunk of streamNutritionReply({
            messages,
            question: effectiveQuestion,
            relevantExcerpts,
            attachedPdfs,
            strictSourceUse: preferences.strictSourceUse,
          })) {
            assistantReply += chunk;
            send({ type: "token", content: chunk });
          }

          assistantReply = applySafetyPostProcessing(
            assistantReply || (await generateNutritionReply({
              messages,
              question: effectiveQuestion,
              relevantExcerpts,
              attachedPdfs,
              strictSourceUse: preferences.strictSourceUse,
            })),
            safety.flags
          );

          const storedTurn = await appendConversationTurn({
            userId: user.id,
            conversationId: body.conversationId,
            userMessage: storedUserMessage,
            userAttachments,
            assistantMessage: assistantReply,
            assistantSources,
            assistantFollowUps,
            mode: preferences.mode,
            responseStyle: preferences.responseStyle,
            safetyFlags: safety.flags,
          });

          send({ type: "done", ...storedTurn });
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unable to process the chat message.";
          send({ type: "error", error: errorMessage });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
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
