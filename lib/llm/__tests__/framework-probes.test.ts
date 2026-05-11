import { describe, expect, it } from "vitest";
import {
  PUBLIC_FRAMEWORKS,
  renderFrameworkLibrary,
} from "@/lib/llm/prompts/framework-library";

describe("PUBLIC_FRAMEWORKS shape", () => {
  it("ships CIRCLES, AARM, and Goals-Signals-Metrics at V1", () => {
    const names = PUBLIC_FRAMEWORKS.map((f) => f.name);
    expect(names).toContain("CIRCLES");
    expect(names).toContain("AARM");
    expect(names).toContain("Goals-Signals-Metrics");
  });

  it("every step has a non-empty probe question (AE2 enforces probe-not-feedback)", () => {
    for (const fw of PUBLIC_FRAMEWORKS) {
      for (const step of fw.steps) {
        expect(step.probe.length, `${fw.name} step ${step.id}`).toBeGreaterThan(10);
        // Probes should be questions ending in ? or asking something
        expect(step.probe).toMatch(/\?$/);
      }
    }
  });

  it("step purposes describe what the step is for, not how", () => {
    for (const fw of PUBLIC_FRAMEWORKS) {
      for (const step of fw.steps) {
        expect(step.purpose.length).toBeGreaterThan(10);
      }
    }
  });

  it("CIRCLES Report-Needs probe asks for needs before solutions (matches AE2 scenario)", () => {
    const circles = PUBLIC_FRAMEWORKS.find((f) => f.name === "CIRCLES");
    expect(circles).toBeDefined();
    const reportNeeds = circles!.steps.find((s) => s.name === "Report Needs");
    expect(reportNeeds).toBeDefined();
    expect(reportNeeds!.probe).toMatch(/before we get to solutions/i);
    expect(reportNeeds!.probe).toMatch(/needs are you prioritizing/i);
  });
});

describe("renderFrameworkLibrary", () => {
  it("renders each framework with name, expansion, and steps", () => {
    const rendered = renderFrameworkLibrary(PUBLIC_FRAMEWORKS);
    for (const fw of PUBLIC_FRAMEWORKS) {
      expect(rendered).toContain(fw.name);
      expect(rendered).toContain(fw.expansion);
      for (const step of fw.steps) {
        expect(rendered).toContain(step.name);
        expect(rendered).toContain(step.probe);
      }
    }
  });

  it("step probes appear as labeled probe lines so the LLM sees them as actionable", () => {
    const rendered = renderFrameworkLibrary(PUBLIC_FRAMEWORKS);
    expect(rendered).toMatch(/Probe if skipped:/);
  });

  it("handles empty framework list without throwing", () => {
    expect(() => renderFrameworkLibrary([])).not.toThrow();
    expect(renderFrameworkLibrary([])).toBe("");
  });
});
