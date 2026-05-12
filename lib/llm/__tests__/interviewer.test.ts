import { describe, expect, it } from "vitest";
import {
  assembleSystemPrompt,
  detectPersonaBreak,
  PERSONA_BREAK_TRIGGER_PATTERNS,
  turnsToMessages,
} from "../interviewer";
import { PRODUCT_DESIGN_CASES } from "@/lib/llm/prompts/case-templates";
import type { Turn } from "@/lib/voice/state-machine";

describe("assembleSystemPrompt", () => {
  it("includes persona, case title, and case body", () => {
    const caseTemplate = PRODUCT_DESIGN_CASES[0]; // meditation-app
    const prompt = assembleSystemPrompt({ caseTemplate });
    // Persona signature
    expect(prompt).toMatch(/Product Manager/i);
    expect(prompt).toMatch(/Alex/);
    // Case content
    expect(prompt).toContain(caseTemplate.title);
    expect(prompt).toContain("meditation");
  });

  it("preserves the probe-not-feedback rule and BAD/GOOD example pair", () => {
    const prompt = assembleSystemPrompt({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
    });
    expect(prompt).toMatch(/Probe,?\s+(?:not|don'?t)\s+feedback/i);
    expect(prompt).toMatch(/BAD:/);
    expect(prompt).toMatch(/GOOD:/);
    expect(prompt).toMatch(/never says.*you skipped X/i);
  });

  it("does NOT inject the framework library into the live interviewer prompt", () => {
    // R2 of the tension-grounded-feedback plan: the framework library is
    // dormant — its content must not appear in the assembled prompt.
    const prompt = assembleSystemPrompt({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
    });
    expect(prompt).not.toMatch(/\bCIRCLES\b/);
    expect(prompt).not.toMatch(/\bAARM\b/);
    expect(prompt).not.toMatch(/\bGoals-Signals-Metrics\b/);
    expect(prompt).not.toMatch(/Probe if skipped:/);
    expect(prompt).not.toMatch(/# Framework library you're aware of/);
  });

  it("explicitly forbids the persona-break shapes", () => {
    const prompt = assembleSystemPrompt({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
    });
    expect(prompt).toMatch(/never appear/i);
    expect(prompt).toMatch(/"As an AI"/);
  });

  it("retains opening-turn discipline (greet, state case, stop)", () => {
    const prompt = assembleSystemPrompt({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
    });
    expect(prompt).toMatch(/Greet the candidate/i);
    expect(prompt).toMatch(/state the case in one clean sentence/i);
    expect(prompt).toMatch(/Do not probe in the opening/i);
  });
});

describe("turnsToMessages", () => {
  function turn(overrides: Partial<Turn> = {}): Turn {
    return {
      id: "t",
      speaker: "user",
      text: "test",
      timestamp: 0,
      partial: false,
      stricken: false,
      ...overrides,
    };
  }

  it("maps speakers to roles", () => {
    const result = turnsToMessages([
      turn({ id: "u1", speaker: "user", text: "Hi" }),
      turn({ id: "a1", speaker: "ai", text: "Hello" }),
    ]);
    expect(result).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]);
  });

  it("excludes stricken turns (R11)", () => {
    const result = turnsToMessages([
      turn({ id: "u1", text: "User research", stricken: false }),
      turn({ id: "u2", text: "Loose research", stricken: true }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("User research");
  });

  it("excludes partial turns", () => {
    const result = turnsToMessages([
      turn({ id: "u1", text: "finished", partial: false }),
      turn({ id: "u2", text: "still typing", partial: true }),
    ]);
    expect(result).toHaveLength(1);
  });
});

describe("detectPersonaBreak (R13 / R15)", () => {
  it.each([
    "As an AI, I cannot answer that.",
    "I'm an AI assistant — let me try to help.",
    "I am an AI language model.",
    "Based on my training data, the answer is unclear.",
    "I'm just a chatbot, but I'll try.",
    "I don't have personal opinions on this.",
    "I cannot actually run that experiment.",
    "I don't have real-time access.",
  ])('flags "%s" as a persona break', (text) => {
    const result = detectPersonaBreak(text);
    expect(result.broke).toBe(true);
    expect(result.matchedTrigger).toBeDefined();
  });

  it.each([
    "That's an interesting framing. Let me push back on the user assumption.",
    "Before we go further, what user needs are you prioritizing?",
    "I'd argue the bigger risk is decision fatigue rather than accessibility.",
    "Walk me through how you'd validate that with five users.",
    "Hmm, I'm not convinced — what evidence would change your mind?",
  ])('does NOT flag in-character probe: "%s"', (text) => {
    expect(detectPersonaBreak(text).broke).toBe(false);
  });

  it("trigger pattern list is non-empty", () => {
    expect(PERSONA_BREAK_TRIGGER_PATTERNS.length).toBeGreaterThan(5);
  });
});
