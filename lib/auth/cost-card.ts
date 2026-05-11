// V0 bakeoff feeds this rate card — see docs/plans/...-plan.md U5.
// V1 ships with placeholder rates that put a believable range on the
// onboarding cost-estimate (R6c) without being authoritative. Treat
// these as best-guess until the bakeoff lands real numbers.

export interface CostRate {
  /** USD per million input tokens (LLM). */
  llmInputPerMillion?: number;
  /** USD per million output tokens (LLM). */
  llmOutputPerMillion?: number;
  /** USD per second of TTS audio (voice provider). */
  voicePerSecond?: number;
}

export const RATE_CARD: Record<string, CostRate> = {
  anthropic: {
    llmInputPerMillion: 3.0,
    llmOutputPerMillion: 15.0,
  },
  openai: {
    llmInputPerMillion: 2.5,
    llmOutputPerMillion: 10.0,
  },
  cartesia: { voicePerSecond: 0.0006 },
  sarvam: { voicePerSecond: 0.0008 },
  elevenlabs: { voicePerSecond: 0.0009 },
};

/** Estimate cost range for a 30-min session given a provider pair. */
export function estimateSessionCost(opts: {
  llmProvider: string;
  voiceProvider: string;
  /** Estimated input tokens consumed (default: 30-min PD case ≈ 8000). */
  inputTokens?: number;
  /** Estimated output tokens generated (default: ≈ 4000). */
  outputTokens?: number;
  /** Estimated AI speaking seconds (default: ≈ 15min = 900s). */
  speakingSeconds?: number;
}): { low: number; high: number } {
  const llm = RATE_CARD[opts.llmProvider] ?? {};
  const voice = RATE_CARD[opts.voiceProvider] ?? {};
  const inTok = opts.inputTokens ?? 8_000;
  const outTok = opts.outputTokens ?? 4_000;
  const sec = opts.speakingSeconds ?? 900;

  const llmCost =
    ((llm.llmInputPerMillion ?? 0) * inTok) / 1_000_000 +
    ((llm.llmOutputPerMillion ?? 0) * outTok) / 1_000_000;
  const voiceCost = (voice.voicePerSecond ?? 0) * sec;
  const total = llmCost + voiceCost;
  // ±35% range to reflect estimate uncertainty
  return { low: total * 0.65, high: total * 1.35 };
}

/** Format a USD range as "$0.05 – $0.12" for the onboarding screen. */
export function formatCostRange(range: { low: number; high: number }): string {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  return `${fmt(range.low)} – ${fmt(range.high)}`;
}
