import { beforeEach, describe, expect, it } from "vitest";
import {
  addLlmTokens,
  addVoiceSeconds,
  computeTotalCost,
  formatTotalCost,
  getCostSnapshot,
  resetCostTracker,
} from "../cost-tracker";

describe("cost-tracker", () => {
  beforeEach(() => {
    resetCostTracker({
      llmProvider: "anthropic",
      voiceProvider: "cartesia",
    });
  });

  it("starts empty after reset", () => {
    const snap = getCostSnapshot();
    expect(snap.llmInputTokens).toBe(0);
    expect(snap.llmOutputTokens).toBe(0);
    expect(snap.voiceSeconds).toBe(0);
    expect(snap.llmProvider).toBe("anthropic");
    expect(snap.voiceProvider).toBe("cartesia");
  });

  it("accumulates LLM token counts across turns", () => {
    addLlmTokens(100, 50);
    addLlmTokens(200, 80);
    const snap = getCostSnapshot();
    expect(snap.llmInputTokens).toBe(300);
    expect(snap.llmOutputTokens).toBe(130);
  });

  it("accumulates voice seconds across AI speaking turns", () => {
    addVoiceSeconds(5.5);
    addVoiceSeconds(12.3);
    expect(getCostSnapshot().voiceSeconds).toBeCloseTo(17.8);
  });

  it("computes total cost from rate card + accumulated counts", () => {
    // Anthropic: $3/M in, $15/M out. Cartesia: $0.0006/s
    addLlmTokens(100_000, 20_000);
    addVoiceSeconds(60);
    // LLM: 100k * 3/M = 0.30, 20k * 15/M = 0.30, total LLM = 0.60
    // Voice: 60 * 0.0006 = 0.036
    // Total ≈ 0.636
    const cost = computeTotalCost();
    expect(cost).toBeCloseTo(0.636, 2);
  });

  it("formatTotalCost renders 3-decimal USD", () => {
    addLlmTokens(100_000, 0);
    // 0.30
    expect(formatTotalCost()).toMatch(/^\$\d+\.\d{3}$/);
    expect(formatTotalCost()).toBe("$0.300");
  });

  it("reset clears previous accumulation", () => {
    addLlmTokens(100_000, 20_000);
    resetCostTracker({
      llmProvider: "anthropic",
      voiceProvider: "cartesia",
    });
    expect(getCostSnapshot().llmInputTokens).toBe(0);
    expect(getCostSnapshot().llmOutputTokens).toBe(0);
  });

  it("changing providers via reset uses the new rate card", () => {
    addLlmTokens(100_000, 20_000);
    addVoiceSeconds(60);
    const anthropicCost = computeTotalCost();

    resetCostTracker({ llmProvider: "openai", voiceProvider: "cartesia" });
    addLlmTokens(100_000, 20_000);
    addVoiceSeconds(60);
    const openaiCost = computeTotalCost();

    // OpenAI is cheaper ($2.5/M + $10/M vs Anthropic $3/M + $15/M)
    expect(openaiCost).toBeLessThan(anthropicCost);
  });

  it("non-finite token counts are ignored, not propagated", () => {
    addLlmTokens(NaN, Infinity);
    expect(getCostSnapshot().llmInputTokens).toBe(0);
    expect(getCostSnapshot().llmOutputTokens).toBe(0);
  });

  it("negative inputs are clamped to zero", () => {
    addLlmTokens(-100, -50);
    addVoiceSeconds(-30);
    expect(getCostSnapshot().llmInputTokens).toBe(0);
    expect(getCostSnapshot().llmOutputTokens).toBe(0);
    expect(getCostSnapshot().voiceSeconds).toBe(0);
  });

  it("unknown provider falls back to zero cost without throwing", () => {
    resetCostTracker({ llmProvider: "unknown", voiceProvider: "unknown" });
    addLlmTokens(100_000, 20_000);
    addVoiceSeconds(60);
    expect(computeTotalCost()).toBe(0);
  });
});
