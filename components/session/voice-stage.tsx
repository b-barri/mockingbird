import { clsx } from "clsx";
import { Orb } from "./orb";
import type { VoiceStateKind } from "@/lib/voice/types";

// Five R9a error states each get explicit copy + recovery affordance.
// Refer to lib/voice/state-machine.ts for the source-of-truth state values.
const ERROR_COPY: Record<
  string,
  { label: string; text: string; cta?: string; dotColor: string }
> = {
  "mic-permission-denied": {
    label: "Microphone needed",
    text: "Microphone access needed — click to grant",
    cta: "Grant microphone access",
    dotColor: "bg-red-500",
  },
  "network-drop": {
    label: "Reconnecting",
    text: "Connection lost — reconnecting…",
    dotColor: "bg-amber-500",
  },
  "asr-no-result": {
    label: "Didn't catch that",
    text: "Could you repeat what you just said?",
    dotColor: "bg-amber-500",
  },
  "key-invalid": {
    label: "API key invalid",
    text: "Your API key was rejected by the provider. Check it in onboarding.",
    cta: "Return to onboarding",
    dotColor: "bg-red-500",
  },
  "provider-timeout": {
    label: "Taking longer than usual",
    text: "The interviewer is taking longer than expected.",
    cta: "Retry",
    dotColor: "bg-amber-500",
  },
};

const NORMAL_COPY: Record<
  Exclude<
    VoiceStateKind,
    | "mic-permission-denied"
    | "network-drop"
    | "asr-no-result"
    | "key-invalid"
    | "provider-timeout"
  >,
  { label: string; text: string }
> = {
  idle: { label: "Idle", text: "Ready to begin." },
  listening: { label: "Listening", text: "Take your time…" },
  thinking: { label: "Thinking", text: "" },
  speaking: { label: "Speaking", text: "" },
};

interface VoiceStageProps {
  state: VoiceStateKind;
  /** Current AI question shown in the question card. */
  currentQuestion?: string;
  /** Recovery CTA handler when the state has one. */
  onErrorAction?: () => void;
}

export function VoiceStage({
  state,
  currentQuestion,
  onErrorAction,
}: VoiceStageProps) {
  const isError = state in ERROR_COPY;

  if (isError) {
    const copy = ERROR_COPY[state];
    return (
      <div
        data-testid="voice-stage-error"
        data-state={state}
        className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center"
      >
        <Orb state={state} />
        <div>
          <div
            className={clsx(
              "mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-mute"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", copy.dotColor)} />
            {copy.label}
          </div>
          <div className="font-display text-2xl italic text-ink">{copy.text}</div>
        </div>
        {copy.cta && (
          <button
            onClick={onErrorAction}
            className="rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink/30"
          >
            {copy.cta}
          </button>
        )}
      </div>
    );
  }

  const copy =
    NORMAL_COPY[
      state as Exclude<
        VoiceStateKind,
        | "mic-permission-denied"
        | "network-drop"
        | "asr-no-result"
        | "key-invalid"
        | "provider-timeout"
      >
    ];

  return (
    <div
      data-testid="voice-stage"
      data-state={state}
      className="flex h-full flex-col items-center justify-center gap-7 p-8"
    >
      {currentQuestion && (
        <div className="w-full rounded-xl border border-ink/[0.07] bg-cream/60 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Currently asking
          </div>
          <p className="font-display text-xl leading-snug tracking-tight text-ink">
            {currentQuestion}
          </p>
        </div>
      )}
      <Orb state={state} />
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.2)]" />
          {copy.label}
        </div>
        {copy.text && (
          <div className="font-display text-lg italic text-ink/80">
            “{copy.text}”
          </div>
        )}
      </div>
    </div>
  );
}
