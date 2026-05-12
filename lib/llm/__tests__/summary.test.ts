import { describe, expect, it } from "vitest";
import {
  assembleSummaryUserMessage,
  summarySystemPrompt,
} from "../summary";
import { PRODUCT_DESIGN_CASES } from "@/lib/llm/prompts/case-templates";
import type { Turn } from "@/lib/voice/state-machine";

function turn(o: Partial<Turn> = {}): Turn {
  return {
    id: "t",
    speaker: "user",
    text: "test",
    timestamp: 0,
    partial: false,
    stricken: false,
    ...o,
  };
}

describe("summary prompt assembly (R16)", () => {
  it("system prompt enforces two-paragraph prose shape with worked / missed sections", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/two paragraphs/i);
    expect(sys).toMatch(/single blank line/i);
    expect(sys).toMatch(/what worked/i);
    expect(sys).toMatch(/what was missed/i);
  });

  it("system prompt requires anchoring every observation to a candidate moment or named tension", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/anchor/i);
    expect(sys).toMatch(/candidate moment|something the candidate (actually )?said/i);
    expect(sys).toMatch(/named tension|tension substance|substance of the (?:named )?tension/i);
  });

  it("system prompt requires prescriptive coaching in the missed paragraph", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/prescriptive/i);
    expect(sys).toMatch(/stronger PM would have|stronger answer would have/i);
  });

  it("system prompt sets the 240-280 word budget for the output", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/240[\s\-–—to]+280\s*words/i);
  });

  it("system prompt forbids framework names and step-number language", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/CIRCLES/);
    expect(sys).toMatch(/AARM/);
    expect(sys).toMatch(/Goals-Signals-Metrics/);
    expect(sys).toMatch(/step\s+(N|1|2)/i);
    expect(sys).not.toMatch(/Framework gaps/);
  });

  it("system prompt forbids sycophancy and generic praise patterns", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/sycophancy/i);
    expect(sys).toMatch(/great job|well done|i love that/i);
    expect(sys).toMatch(/good structure|organized your answer well|be more specific/i);
  });

  it("system prompt forbids bullets, headers, and bold within paragraphs", () => {
    const sys = summarySystemPrompt();
    // The prompt frames these as "must NEVER appear" — assert each item is named.
    expect(sys).toMatch(/bullets/i);
    expect(sys).toMatch(/headers/i);
    expect(sys).toMatch(/bold/i);
    // And confirm they are listed under a prohibition framing.
    expect(sys).toMatch(/must NEVER appear|not allowed|forbidden|do not (use|include)/i);
  });

  it("user message includes case title + transcript with speaker prefixes", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [
        turn({ id: "ai-1", speaker: "ai", text: "Who are we designing for?" }),
        turn({ id: "u-1", speaker: "user", text: "65+ adults." }),
      ],
    });
    expect(message).toContain(PRODUCT_DESIGN_CASES[0].title);
    expect(message).toContain("Alex: Who are we designing for?");
    expect(message).toContain("Candidate: 65+ adults.");
  });

  it("user message excludes stricken turns (R11)", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [
        turn({ id: "u-1", text: "User research is the core" }),
        turn({ id: "u-2", text: "Loose research is the core", stricken: true }),
      ],
    });
    expect(message).toContain("User research");
    expect(message).not.toContain("Loose research");
  });

  it("user message excludes partial turns", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [
        turn({ id: "u-1", text: "finished", partial: false }),
        turn({ id: "u-2", text: "still typ", partial: true }),
      ],
    });
    expect(message).toContain("finished");
    expect(message).not.toContain("still typ");
  });

  it("user message includes the case evalRubric under a labeled section", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [turn({ id: "u-1", text: "Hello." })],
    });
    expect(message).toMatch(/Tensions this case is testing:/i);
    expect(message).toContain(PRODUCT_DESIGN_CASES[0].evalRubric);
  });

  it("user message renders the evalRubric exactly once even on repeated calls", () => {
    const inputs = {
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [turn({ id: "u-1", text: "Hello." })],
    };
    const m1 = assembleSummaryUserMessage(inputs);
    const m2 = assembleSummaryUserMessage(inputs);
    const rubric = PRODUCT_DESIGN_CASES[0].evalRubric;
    expect(m1.split(rubric).length - 1).toBe(1);
    expect(m2.split(rubric).length - 1).toBe(1);
  });

  it("user message places the evalRubric section before the transcript", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [turn({ id: "u-1", text: "Hello." })],
    });
    const rubricIdx = message.indexOf("Tensions this case is testing:");
    const transcriptIdx = message.indexOf("Transcript:");
    expect(rubricIdx).toBeGreaterThan(-1);
    expect(transcriptIdx).toBeGreaterThan(-1);
    expect(rubricIdx).toBeLessThan(transcriptIdx);
  });
});
