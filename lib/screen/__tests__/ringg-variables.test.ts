import { describe, expect, it } from "vitest";
import { briefToRinggVariables } from "@/lib/screen/ringg-variables";
import type { Brief } from "@/lib/screen/brief";

function brief(over: Partial<Brief> = {}): Brief {
  return {
    id: "b1",
    company: "Fireflies.ai",
    role: "Product Manager",
    companyUrl: "https://fireflies.ai",
    likelyQuestions: [
      { question: "Why Fireflies?", rationale: "tests fit", companySpecific: true },
      { question: "Tell me about a launch", rationale: "role staple", companySpecific: false },
    ],
    evalParameters: [
      { name: "Product sense", description: "reasons from user need" },
      { name: "Communication", description: "structured, concise" },
    ],
    companySignals: [{ point: "knows the AI notetaker", companySpecific: true }],
    candidateGaps: ["no B2B SaaS experience"],
    hasCompanySignal: true,
    generatedAt: 0,
    ...over,
  };
}

describe("briefToRinggVariables", () => {
  it("passes company and role straight through", () => {
    const v = briefToRinggVariables(brief(), "Bhavya");
    expect(v.company).toBe("Fireflies.ai");
    expect(v.role).toBe("Product Manager");
  });

  it("builds a numbered questions list from likelyQuestions (text only, no rationale)", () => {
    const v = briefToRinggVariables(brief(), "Bhavya");
    expect(v.questions).toBe("1. Why Fireflies?\n2. Tell me about a launch");
    expect(v.questions).not.toContain("tests fit"); // rationale is not spoken
  });

  it("builds signals from evalParameters as 'name (description)' joined by ;", () => {
    const v = briefToRinggVariables(brief(), "Bhavya");
    expect(v.signals).toBe(
      "Product sense (reasons from user need); Communication (structured, concise)"
    );
  });

  it("uses the candidate name when provided", () => {
    expect(briefToRinggVariables(brief(), "Bhavya").callee_name).toBe("Bhavya");
  });

  it("defaults callee_name to a friendly generic when missing or blank", () => {
    expect(briefToRinggVariables(brief()).callee_name).toBe("there");
    expect(briefToRinggVariables(brief(), "   ").callee_name).toBe("there");
  });

  it("falls back to default questions when the brief has none", () => {
    const v = briefToRinggVariables(brief({ likelyQuestions: [] }), "Bhavya");
    expect(v.questions).toContain("Why are you interested in this role?");
  });

  it("falls back to default signals when the brief has no eval parameters", () => {
    const v = briefToRinggVariables(brief({ evalParameters: [] }), "Bhavya");
    expect(v.signals).toContain("product sense");
  });

  it("emits exactly the five keys the Ringg assistant expects", () => {
    const v = briefToRinggVariables(brief(), "Bhavya");
    expect(Object.keys(v).sort()).toEqual(
      ["callee_name", "company", "questions", "role", "signals"].sort()
    );
  });
});
