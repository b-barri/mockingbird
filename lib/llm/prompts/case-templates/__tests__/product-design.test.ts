import { describe, expect, it } from "vitest";
import {
  PRODUCT_DESIGN_CASES,
  getCaseById,
  pickRandomCase,
} from "@/lib/llm/prompts/case-templates/product-design";

// Heuristics enforce that evalRubric is genuinely an eval rubric (load-bearing
// for the coach prompt), not a copy-paste of brief. The structural markers
// catch the laziest authoring regressions; manual review is the real quality
// gate for substantive richness.

const FRAMEWORK_NAME = /\b(CIRCLES|AARM|Goals-Signals-Metrics)\b/i;
const STEP_NUMBER = /\bstep\s+\d+\b/i;
const ENGAGEMENT_MARKERS = [
  "strong",
  "weak",
  "miss",
  "trade-off",
  " vs ",
  " versus ",
];

describe("PRODUCT_DESIGN_CASES shape", () => {
  it("every case has an evalRubric of at least 200 characters", () => {
    for (const c of PRODUCT_DESIGN_CASES) {
      expect(c.evalRubric.length, `${c.id} evalRubric length`).toBeGreaterThanOrEqual(200);
    }
  });

  it("every case's evalRubric is materially distinct from its brief (> 2x length)", () => {
    for (const c of PRODUCT_DESIGN_CASES) {
      expect(
        c.evalRubric.length,
        `${c.id} evalRubric should be > 2x brief length to rule out copy-paste`,
      ).toBeGreaterThan(c.brief.length * 2);
    }
  });

  it("every case's evalRubric names two or more engagement-level markers", () => {
    for (const c of PRODUCT_DESIGN_CASES) {
      const lower = c.evalRubric.toLowerCase();
      const hits = ENGAGEMENT_MARKERS.filter((m) => lower.includes(m));
      expect(
        hits.length,
        `${c.id} evalRubric matched markers: ${hits.join(", ")}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("no evalRubric or brief contains a framework name or step-number language", () => {
    for (const c of PRODUCT_DESIGN_CASES) {
      expect(c.evalRubric, `${c.id} evalRubric framework leak`).not.toMatch(
        FRAMEWORK_NAME,
      );
      expect(c.evalRubric, `${c.id} evalRubric step-N leak`).not.toMatch(
        STEP_NUMBER,
      );
      expect(c.brief, `${c.id} brief framework leak`).not.toMatch(FRAMEWORK_NAME);
      expect(c.brief, `${c.id} brief step-N leak`).not.toMatch(STEP_NUMBER);
    }
  });

  it("every case has a unique id and the required CaseTemplate fields populated", () => {
    const ids = new Set<string>();
    for (const c of PRODUCT_DESIGN_CASES) {
      expect(ids.has(c.id), `duplicate id ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.brief.length).toBeGreaterThan(0);
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(c.evalRubric.length).toBeGreaterThan(0);
      expect(c.type).toBe("product-design");
      expect(c.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});

describe("case-template lookups", () => {
  it("getCaseById returns the matching case with evalRubric populated", () => {
    const c = getCaseById("instagram-teen-wellbeing");
    expect(c).toBeDefined();
    expect(c!.evalRubric).toContain("engagement");
    expect(c!.evalRubric).toContain("harm");
  });

  it("getCaseById returns undefined for an unknown id", () => {
    expect(getCaseById("does-not-exist")).toBeUndefined();
  });

  it("pickRandomCase returns a case with evalRubric in the shape", () => {
    const c = pickRandomCase();
    expect(c).toBeDefined();
    expect(typeof c.evalRubric).toBe("string");
    expect(c.evalRubric.length).toBeGreaterThan(0);
  });
});
