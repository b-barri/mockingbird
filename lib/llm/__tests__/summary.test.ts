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
  it("system prompt forbids bullets/headers and caps word count", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/no bullets, no headers, no bold/i);
    expect(sys).toMatch(/no more than 180 words/i);
  });

  it("system prompt names the 3 required sections (structure, strongest, gaps)", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/Structure/);
    expect(sys).toMatch(/Strongest moment/);
    expect(sys).toMatch(/Framework gaps/);
  });

  it("system prompt forbids sycophancy ('no great job overall')", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/No sycophancy/i);
    expect(sys).toMatch(/great job overall/);
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
});
