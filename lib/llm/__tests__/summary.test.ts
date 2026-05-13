import { describe, expect, it } from "vitest";
import {
  assembleSummaryUserMessage,
  parseFeedback,
  summarySystemPrompt,
  type StructuredFeedback,
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

describe("summary system prompt — structured JSON output", () => {
  it("instructs the LLM to return JSON only (no preamble, no markdown fence)", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/return only.*json/i);
    expect(sys).toMatch(/no preamble|no markdown code fence/i);
  });

  it("specifies the 4-dimension structure with the required first two dimensions", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/4 dimensions|exactly 4 dimensions|four dimensions/i);
    expect(sys).toMatch(/Customer focus/);
    expect(sys).toMatch(/Structure/);
    expect(sys).toMatch(/case-tension sides|tension side|two case-specific/i);
  });

  it("constrains verdict to exactly strong/developing/missing", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/strong/i);
    expect(sys).toMatch(/developing/i);
    expect(sys).toMatch(/missing/i);
    // The prompt should disallow other vocabulary
    expect(sys).toMatch(/exactly one of|no other vocabulary|exactly one/i);
  });

  it("requires whatWorked + whatMissed within the 240-280 word budget", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/whatWorked/);
    expect(sys).toMatch(/whatMissed/);
    expect(sys).toMatch(/240[-\s–—to]+280\s*words/i);
  });

  it("requires anchoring observations to candidate moments or tension substance", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/anchor/i);
    expect(sys).toMatch(/candidate moment|something the candidate said/i);
    expect(sys).toMatch(/tension substance|substance of the (?:named )?tension|tension.+plain language/i);
  });

  it("requires prescriptive coaching in whatMissed", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/prescriptive/i);
    expect(sys).toMatch(/stronger PM would have|stronger answer would have/i);
  });

  it("forbids framework names, step language, generic praise, sycophancy", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/CIRCLES/);
    expect(sys).toMatch(/AARM/);
    expect(sys).toMatch(/Goals-Signals-Metrics/);
    expect(sys).toMatch(/step\s+(N|1|2)/i);
    expect(sys).toMatch(/sycophancy/i);
    expect(sys).toMatch(/great job|well done|i love that/i);
    expect(sys).toMatch(/good structure|organized your answer well|be more specific/i);
    expect(sys).not.toMatch(/Framework gaps/);
  });

  it("forbids numeric scores or ordinal ratings (verdicts only)", () => {
    const sys = summarySystemPrompt();
    expect(sys).toMatch(/numeric scores|ordinal ratings|no numeric/i);
    expect(sys).toMatch(/categorical/i);
  });
});

describe("assembleSummaryUserMessage", () => {
  it("includes case title + transcript with speaker prefixes", () => {
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

  it("excludes stricken turns (R11)", () => {
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

  it("excludes partial turns", () => {
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

  it("includes the case evalRubric under a labeled section", () => {
    const message = assembleSummaryUserMessage({
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [turn({ id: "u-1", text: "Hello." })],
    });
    expect(message).toMatch(/Tensions this case is testing:/i);
    expect(message).toContain(PRODUCT_DESIGN_CASES[0].evalRubric);
  });

  it("renders the evalRubric exactly once even on repeated calls", () => {
    const inputs = {
      caseTemplate: PRODUCT_DESIGN_CASES[0],
      turns: [turn({ id: "u-1", text: "Hello." })],
    };
    const m1 = assembleSummaryUserMessage(inputs);
    const rubric = PRODUCT_DESIGN_CASES[0].evalRubric;
    expect(m1.split(rubric).length - 1).toBe(1);
  });

  it("places the evalRubric section before the transcript", () => {
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

describe("parseFeedback", () => {
  const validFeedback: StructuredFeedback = {
    dimensions: [
      { name: "Customer focus", verdict: "strong", observation: "Sharp target." },
      { name: "Structure", verdict: "developing", observation: "Mostly logical." },
      { name: "Engagement side", verdict: "strong", observation: "Named levers." },
      { name: "Harm side", verdict: "missing", observation: "Never reached." },
    ],
    whatWorked: "Strong customer framing anchored the answer.",
    whatMissed: "Harm side was absent throughout — a stronger answer would have led there.",
  };

  it("parses a well-formed JSON object", () => {
    const result = parseFeedback(JSON.stringify(validFeedback));
    expect(result.dimensions).toHaveLength(4);
    expect(result.dimensions[0].name).toBe("Customer focus");
    expect(result.dimensions[3].verdict).toBe("missing");
    expect(result.whatWorked).toContain("customer framing");
  });

  it("tolerates a markdown code-fence wrapper", () => {
    const fenced = "```json\n" + JSON.stringify(validFeedback) + "\n```";
    const result = parseFeedback(fenced);
    expect(result.dimensions).toHaveLength(4);
  });

  it("tolerates a bare ``` fence (no language tag)", () => {
    const fenced = "```\n" + JSON.stringify(validFeedback) + "\n```";
    const result = parseFeedback(fenced);
    expect(result.dimensions).toHaveLength(4);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseFeedback("not json at all")).toThrow(/parse/i);
  });

  it("throws if dimensions is missing or not an array", () => {
    expect(() => parseFeedback('{"whatWorked":"x","whatMissed":"y"}')).toThrow(
      /dimensions/i
    );
  });

  it("throws if dimensions count is not exactly 4", () => {
    const threeOnly = { ...validFeedback, dimensions: validFeedback.dimensions.slice(0, 3) };
    expect(() => parseFeedback(JSON.stringify(threeOnly))).toThrow(
      /exactly 4|got 3/i
    );
  });

  it("throws if a verdict is not strong/developing/missing", () => {
    const bad = {
      ...validFeedback,
      dimensions: [
        { name: "Customer focus", verdict: "great", observation: "x" },
        ...validFeedback.dimensions.slice(1),
      ],
    };
    expect(() => parseFeedback(JSON.stringify(bad))).toThrow(/invalid verdict/i);
  });

  it("throws if whatWorked or whatMissed is missing", () => {
    const noWorked = { ...validFeedback, whatWorked: "" };
    expect(() => parseFeedback(JSON.stringify(noWorked))).toThrow(/whatWorked/);
  });

  it("throws if a dimension is missing name or observation", () => {
    const badName = {
      ...validFeedback,
      dimensions: [
        { name: "", verdict: "strong", observation: "x" },
        ...validFeedback.dimensions.slice(1),
      ],
    };
    expect(() => parseFeedback(JSON.stringify(badName))).toThrow(/name/i);
  });
});
