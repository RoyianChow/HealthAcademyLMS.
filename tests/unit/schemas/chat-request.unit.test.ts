/**
 * Unit tests — chat request Zod schema (mirrors app/api/chat/route.ts)
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

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

describe("chatRequestSchema", () => {
  it("parses a valid minimal body", () => {
    const result = chatRequestSchema.parse({
      message: "Hello coach",
      conversationId: "conv-1",
    });

    expect(result.message).toBe("Hello coach");
    expect(result.conversationId).toBe("conv-1");
  });

  it("accepts a message of exactly 1000 characters", () => {
    const message = "a".repeat(1000);

    expect(
      chatRequestSchema.parse({
        message,
        conversationId: "conv-1",
      }).message
    ).toHaveLength(1000);
  });

  it("rejects a message longer than 1000 characters", () => {
    expect(() =>
      chatRequestSchema.parse({
        message: "a".repeat(1001),
        conversationId: "conv-1",
      })
    ).toThrow();
  });

  it("rejects a missing conversationId", () => {
    expect(() =>
      chatRequestSchema.parse({
        message: "Hello",
      })
    ).toThrow();
  });

  it("rejects an empty conversationId", () => {
    expect(() =>
      chatRequestSchema.parse({
        message: "Hello",
        conversationId: "",
      })
    ).toThrow();
  });

  it("rejects an invalid mode", () => {
    expect(() =>
      chatRequestSchema.parse({
        message: "Hello",
        conversationId: "conv-1",
        mode: "invalid",
      })
    ).toThrow();
  });

  it("rejects an invalid tone", () => {
    expect(() =>
      chatRequestSchema.parse({
        message: "Hello",
        conversationId: "conv-1",
        tone: "invalid",
      })
    ).toThrow();
  });

  it("allows optional fields to be omitted", () => {
    const result = chatRequestSchema.parse({
      message: "Hello",
      conversationId: "conv-1",
    });

    expect(result.mode).toBeUndefined();
    expect(result.tone).toBeUndefined();
    expect(result.responseStyle).toBeUndefined();
    expect(result.strictSourceUse).toBeUndefined();
    expect(result.pdfScope).toBeUndefined();
    expect(result.activeCourseId).toBeUndefined();
  });
});
