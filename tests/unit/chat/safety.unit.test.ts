/**
 * Unit tests — lib/chat/safety.ts
 */

import { describe, expect, it } from "vitest";
import { analyzeSafety, applySafetyPostProcessing } from "@/lib/chat/safety";
import type { ChatSafetyFlag } from "@/lib/chat/types";

describe("analyzeSafety", () => {
  it("returns no flags for a clean nutrition question", () => {
    const result = analyzeSafety("What are healthy sources of protein?");

    expect(result.flags).toEqual([]);
    expect(result.overrideReply).toBeUndefined();
    expect(result.promptBlock).toContain("Safety rules:");
    expect(result.promptBlock).not.toContain("Active guardrail");
  });

  it("returns caution flags for medication-related questions", () => {
    const result = analyzeSafety("Can I change my diet while on metformin?");

    expect(result.flags.some((flag) => flag.id === "medication")).toBe(true);
    expect(result.overrideReply).toBeUndefined();
    expect(result.promptBlock).toContain("Active guardrail: Medication");
  });

  it("returns caution flags for pregnancy-related questions", () => {
    const result = analyzeSafety("What should I eat while breastfeeding?");

    expect(result.flags.some((flag) => flag.id === "pregnancy")).toBe(true);
    expect(result.overrideReply).toBeUndefined();
  });

  it("returns urgent override reply for crisis language", () => {
    const result = analyzeSafety("I want to hurt myself");

    expect(result.flags.some((flag) => flag.id === "self-harm")).toBe(true);
    expect(result.overrideReply).toContain("contact emergency services");
  });

  it("returns urgent override reply for breathing difficulty", () => {
    const result = analyzeSafety("I can't breathe after eating");

    expect(result.flags.some((flag) => flag.id === "breathing")).toBe(true);
    expect(result.overrideReply).toBeDefined();
  });
});

describe("applySafetyPostProcessing", () => {
  const cautionFlags: ChatSafetyFlag[] = [
    {
      id: "medication",
      label: "Medication",
      severity: "medium",
      note: "Avoid medication-specific nutrition instructions.",
    },
  ];

  it("returns the reply unchanged when there are no flags", () => {
    const reply = "Eat balanced meals with whole grains.";

    expect(applySafetyPostProcessing(reply, [])).toBe(reply);
  });

  it("appends a clinician reminder when flags are present", () => {
    const reply = "Focus on whole foods and fiber.";

    const processed = applySafetyPostProcessing(reply, cautionFlags);

    expect(processed).toContain(reply);
    expect(processed).toContain("Because this touches on medication");
    expect(processed).toContain("qualified clinician");
  });

  it("does not append a reminder when the reply already mentions a clinician", () => {
    const reply =
      "Please discuss this with your doctor before making major diet changes.";

    expect(applySafetyPostProcessing(reply, cautionFlags)).toBe(reply);
  });
});
