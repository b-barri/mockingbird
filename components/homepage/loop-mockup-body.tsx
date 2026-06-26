"use client";

import { useEffect, useState } from "react";

// Animated mini-mockup of the "02 · The loop" phase card on the homepage.
// Cycles through listening, thinking, and speaking to preview what the live
// session screen actually does, rotating probes during the speaking beat
// so the visitor sees variety. Pure CSS animations plus a small state machine.
// No audio, no real LLM calls.

type LoopState = "listening" | "thinking" | "speaking";

// Sample probes Alex would ask during a real session. Cycled during the
// speaking state to show the range of question shapes.
const PROBES = [
  "Walk me through your segments.",
  "What did you prioritize, and why?",
  "How would you measure success in 30 days?",
  "What's the riskiest assumption here?",
] as const;

// State durations in ms. Total cycle: 3500 + 1800 + 3800 = ~9.1s per full loop.
const DURATIONS: Record<LoopState, number> = {
  listening: 3500,
  thinking: 1800,
  speaking: 3800,
};

const NEXT_STATE: Record<LoopState, LoopState> = {
  listening: "thinking",
  thinking: "speaking",
  speaking: "listening",
};

export function LoopMockupBody() {
  const [state, setState] = useState<LoopState>("listening");
  const [probeIdx, setProbeIdx] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = NEXT_STATE[state];
      setState(next);
      // Rotate the probe each time we leave the speaking state.
      if (state === "speaking") {
        setProbeIdx((i) => (i + 1) % PROBES.length);
      }
    }, DURATIONS[state]);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const probe = PROBES[probeIdx];

  return (
    <>
      <div className="mb-2 font-semibold tracking-[0.08em] text-coral">
        Case · design a friending feature
      </div>

      {/* Orb stage — coral when listening/speaking, dimmer while thinking */}
      <div className="relative my-3 flex h-20 items-center justify-center">
        {/* Expanding rings only during listening + speaking — the audio-active states */}
        {(state === "listening" || state === "speaking") && (
          <>
            <span
              className="absolute h-14 w-14 animate-ring-expand rounded-full border border-coral/30"
              aria-hidden
            />
            <span
              className="absolute h-14 w-14 animate-ring-expand rounded-full border border-coral/30"
              style={{ animationDelay: "1.3s" }}
              aria-hidden
            />
          </>
        )}
        <span
          className={
            "block h-14 w-14 animate-orb-pulse rounded-full shadow-[0_0_24px_rgba(232,93,59,0.45)] transition-opacity duration-500 " +
            (state === "thinking"
              ? "bg-[radial-gradient(circle_at_35%_35%,#FF8A5E,#B33B23_50%,#8E2E0A_95%)] opacity-65"
              : "bg-[radial-gradient(circle_at_35%_35%,#FF8A5E,#E85D3B_50%,#A13319_95%)] opacity-100")
          }
          aria-hidden
        />
      </div>

      {/* Quote line — only shown when Alex is speaking the probe */}
      <div
        className="min-h-[36px] text-center text-[12px] text-ink transition-opacity duration-300"
        style={{
          opacity: state === "speaking" ? 1 : 0,
        }}
      >
        &ldquo;{probe}&rdquo;
      </div>

      {/* Status line — swaps per state */}
      <div className="mt-3 text-center text-ink-2">
        {state === "listening" && <span>Listening</span>}
        {state === "thinking" && (
          <span className="text-mute">Alex is thinking</span>
        )}
        {state === "speaking" && <span>Speaking</span>}
      </div>

      <div className="flex-1" />
    </>
  );
}
