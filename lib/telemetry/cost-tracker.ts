import { RATE_CARD } from "@/lib/auth/cost-card";

// In-session cost accumulator for R6c. Held in module-local state so the
// post-session summary route (U7) and onboarding cost-estimate (U5) read
// from the same source. Reset on every new session start.

export interface SessionCostAccumulator {
  llmProvider: string;
  voiceProvider: string;
  llmInputTokens: number;
  llmOutputTokens: number;
  voiceSeconds: number;
}

const EMPTY: SessionCostAccumulator = {
  llmProvider: "",
  voiceProvider: "",
  llmInputTokens: 0,
  llmOutputTokens: 0,
  voiceSeconds: 0,
};

let current: SessionCostAccumulator = { ...EMPTY };

export function resetCostTracker(opts: {
  llmProvider: string;
  voiceProvider: string;
}): void {
  current = {
    ...EMPTY,
    llmProvider: opts.llmProvider,
    voiceProvider: opts.voiceProvider,
  };
}

export function addLlmTokens(input: number, output: number): void {
  if (!Number.isFinite(input) || !Number.isFinite(output)) return;
  current.llmInputTokens += Math.max(0, input);
  current.llmOutputTokens += Math.max(0, output);
}

export function addVoiceSeconds(seconds: number): void {
  if (!Number.isFinite(seconds)) return;
  current.voiceSeconds += Math.max(0, seconds);
}

export function getCostSnapshot(): SessionCostAccumulator {
  return { ...current };
}

/** Compute total USD cost from the accumulator's current state. */
export function computeTotalCost(
  accumulator: SessionCostAccumulator = current
): number {
  const llm = RATE_CARD[accumulator.llmProvider] ?? {};
  const voice = RATE_CARD[accumulator.voiceProvider] ?? {};
  const llmCost =
    ((llm.llmInputPerMillion ?? 0) * accumulator.llmInputTokens) /
      1_000_000 +
    ((llm.llmOutputPerMillion ?? 0) * accumulator.llmOutputTokens) /
      1_000_000;
  const voiceCost = (voice.voicePerSecond ?? 0) * accumulator.voiceSeconds;
  return llmCost + voiceCost;
}

/** Format the running total as USD for the session summary screen (R16a). */
export function formatTotalCost(): string {
  const total = computeTotalCost();
  return `$${total.toFixed(3)}`;
}
