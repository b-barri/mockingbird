// First-party telemetry event emitter. Fires fire-and-forget POSTs to
// /api/telemetry. Sufficient for V1 — full analytics is V2 work. Events
// surface in Vercel logs where the operator can grep for patterns.

export type TelemetryEvent =
  | {
      type: "latency";
      /** End-to-end listen-end → speech-start in ms (R9b budget < 1.5s p50). */
      ms: number;
    }
  | {
      type: "asr-confidence";
      speaker: "user" | "ai";
      /** ASR confidence 0..1 from the voice provider. */
      score: number;
    }
  | {
      type: "persona-break";
      matchedTrigger: string;
      /** First ~80 chars of the offending LLM output (no PII risk — it's the AI's words). */
      excerpt: string;
    }
  | {
      type: "transcript-strike";
      /** R11 instrumentation: track how often candidates strike turns. */
      reason?: "asr-mishear" | "intentional" | "unknown";
    }
  | {
      type: "session-start";
      caseId: string;
      llmProvider: string;
      voiceProvider: string;
    }
  | {
      type: "session-end";
      durationMs: number;
      turnCount: number;
      finalCostUsd: number;
    };

/** Fire-and-forget telemetry. Never blocks the UI; errors are swallowed. */
export async function emit(event: TelemetryEvent): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true, // survives page-unload during session-end
    });
  } catch {
    // Telemetry must never throw into user code. Drop silently.
  }
}

// Sync convenience: callable from React effects without await.
export function fireAndForget(event: TelemetryEvent): void {
  void emit(event);
}
