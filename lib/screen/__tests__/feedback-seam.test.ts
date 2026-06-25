import { describe, expect, it } from "vitest";
import {
  type Brief,
  briefToRubric,
  briefDimensionNames,
} from "@/lib/screen/brief";
import {
  mapTranscriptToTurns,
  renderScreeningTranscript,
  isUnscorable,
  type TranscriptEntry,
} from "@/lib/screen/transcript";
import {
  screeningCoachSystemPrompt,
  screeningSystemPromptFor,
  parseScreeningFeedback,
  tryParseScreeningFeedback,
  ScreeningFeedbackError,
} from "@/lib/screen/feedback";

// --- fixtures ---------------------------------------------------------------

function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    id: "b1",
    company: "Fireflies",
    role: "Product Manager",
    companyUrl: "https://fireflies.ai",
    likelyQuestions: [
      { question: "Why Fireflies?", rationale: "fit", companySpecific: true },
    ],
    evalParameters: [
      { name: "Product sense", description: "reasons from user need" },
      { name: "Prioritization", description: "ranks under constraint" },
      { name: "Communication", description: "structured, concise" },
    ],
    companySignals: [
      { point: "knows the AI notetaker product", companySpecific: true },
    ],
    candidateGaps: ["no B2B SaaS experience"],
    hasCompanySignal: true,
    generatedAt: 0,
    ...overrides,
  };
}

function feedbackJson(dimensionNames: ReadonlyArray<string>): string {
  return JSON.stringify({
    dimensions: dimensionNames.map((name) => ({
      name,
      verdict: "developing",
      observation: "anchored observation about the candidate moment here ok",
    })),
    whatWorked: "w".repeat(120),
    whatMissed: "m".repeat(120),
  });
}

// --- variable dimension count (the P0 fix) ----------------------------------

describe("screening feedback — variable dimension count", () => {
  it("round-trips a 3-dimension rubric without throwing", () => {
    const b = brief();
    const names = briefDimensionNames(b);
    expect(names).toHaveLength(3);
    const fb = parseScreeningFeedback(feedbackJson(names), names);
    expect(fb.dimensions.map((d) => d.name)).toEqual(names);
  });

  it("round-trips a 5-dimension rubric without throwing", () => {
    const b = brief({
      evalParameters: [
        { name: "A", description: "a" },
        { name: "B", description: "b" },
        { name: "C", description: "c" },
        { name: "D", description: "d" },
        { name: "E", description: "e" },
      ],
    });
    const names = briefDimensionNames(b);
    const fb = parseScreeningFeedback(feedbackJson(names), names);
    expect(fb.dimensions).toHaveLength(5);
  });

  it("rejects a dimension-count mismatch with a typed error", () => {
    const names = ["Product sense", "Prioritization", "Communication"];
    // LLM returned only 2 dimensions.
    const bad = feedbackJson(["Product sense", "Prioritization"]);
    expect(() => parseScreeningFeedback(bad, names)).toThrow(
      ScreeningFeedbackError
    );
  });
});

// --- non-throwing async path ------------------------------------------------

describe("tryParseScreeningFeedback — async-safe", () => {
  it("returns ok:true on valid feedback", () => {
    const names = ["A", "B"];
    const res = tryParseScreeningFeedback(feedbackJson(names), names);
    expect(res.ok).toBe(true);
  });

  it("returns ok:false (never throws) on garbage", () => {
    const res = tryParseScreeningFeedback("not json at all", ["A"]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/json/i);
  });

  it("returns ok:false on count mismatch instead of throwing", () => {
    const names = ["A", "B", "C"];
    const res = tryParseScreeningFeedback(feedbackJson(["A"]), names);
    expect(res.ok).toBe(false);
  });
});

// --- adversarial transcript shapes (de-risk note) ---------------------------

describe("transcript mapper — adversarial shapes", () => {
  it("maps clean alternating turns with neutral labels (no 'Alex')", () => {
    const entries: TranscriptEntry[] = [
      { speaker: "interviewer", text: "Tell me about a launch." },
      { speaker: "candidate", text: "I shipped a referral feature." },
    ];
    const turns = mapTranscriptToTurns(entries);
    const rendered = renderScreeningTranscript(turns);
    expect(rendered).toContain("Interviewer:");
    expect(rendered).toContain("Candidate:");
    expect(rendered).not.toContain("Alex");
  });

  it("drops empty / whitespace-only utterances", () => {
    const turns = mapTranscriptToTurns([
      { speaker: "interviewer", text: "   " },
      { speaker: "candidate", text: "real answer" },
      { speaker: "candidate", text: "" },
    ]);
    expect(turns).toHaveLength(1);
    expect(turns[0].text).toBe("real answer");
  });

  it("flags an empty transcript as unscorable rather than crashing", () => {
    const turns = mapTranscriptToTurns([]);
    expect(isUnscorable(turns)).toBe(true);
  });

  it("flags an interviewer-only transcript (no candidate speech) as unscorable", () => {
    const turns = mapTranscriptToTurns([
      { speaker: "interviewer", text: "Hello? Are you there?" },
    ]);
    expect(isUnscorable(turns)).toBe(true);
  });
});

// --- prompt + rubric --------------------------------------------------------

describe("screening coach prompt", () => {
  it("names exactly the brief's eval parameters as dimensions, in order", () => {
    const b = brief();
    const sys = screeningSystemPromptFor(b);
    expect(sys).toContain("Product sense");
    expect(sys).toContain("Prioritization");
    expect(sys).toContain("Communication");
    expect(sys).toMatch(/exactly 3 dimensions/);
  });

  it("does not reference the product-design coach's hardcoded dimensions", () => {
    const sys = screeningCoachSystemPrompt(["X", "Y"]);
    expect(sys).not.toContain("Customer focus");
    expect(sys).not.toContain("Structure");
    expect(sys).not.toContain("Alex");
  });

  it("forbids frameworks and numeric scores", () => {
    const sys = screeningCoachSystemPrompt(["X"]);
    expect(sys).toMatch(/CIRCLES/);
    expect(sys).toMatch(/numeric scores/i);
  });
});

describe("briefToRubric — graceful degradation", () => {
  it("labels the no-company-signal case instead of inventing detail", () => {
    const b = brief({ companySignals: [], hasCompanySignal: false });
    const rubric = briefToRubric(b);
    expect(rubric).toMatch(/no company-specific signal found/i);
  });
});
