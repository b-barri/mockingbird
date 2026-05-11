"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { Orb } from "./orb";
import { useMicCapture, type MicErrorKind } from "@/lib/voice/mic-capture";
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
    cta: "Try again",
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
  /**
   * Text-mode submit (V1 preview when voice key isn't configured). Renders
   * a textarea + Send button while state === 'listening'.
   */
  onSubmitTurn?: (text: string) => void;
  /**
   * Voice-mode submit. Renders a push-to-talk mic button while state ===
   * 'listening'. Takes precedence over onSubmitTurn when provided.
   */
  onVoiceBlob?: (blob: Blob, durationMs: number) => void;
  /** Forwarded to useMicCapture so the session page can surface mic errors. */
  onMicError?: (kind: MicErrorKind, message: string) => void;
}

export function VoiceStage({
  state,
  currentQuestion,
  onErrorAction,
  onSubmitTurn,
  onVoiceBlob,
  onMicError,
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

  const voiceModeActive = state === "listening" && Boolean(onVoiceBlob);
  const textModeActive =
    state === "listening" && !onVoiceBlob && Boolean(onSubmitTurn);

  return (
    <div
      data-testid="voice-stage"
      data-state={state}
      className="flex h-full flex-col gap-4 overflow-hidden p-6"
    >
      {/* Top section scrolls when the AI's current question is long. The
          mic/text input below stays anchored — the candidate should never
          have to scroll to find the input affordance. */}
      <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto">
        {currentQuestion && (
          <div className="w-full shrink-0 rounded-xl border border-ink/[0.07] bg-cream/60 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              Currently asking
            </div>
            <p className="font-display text-xl leading-snug tracking-tight text-ink">
              {currentQuestion}
            </p>
          </div>
        )}
        <div className="shrink-0">
          <Orb state={state} />
        </div>
        <div className="shrink-0 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.2)]" />
            {copy.label}
          </div>
          {copy.text && !voiceModeActive && !textModeActive && (
            <div className="font-display text-lg italic text-ink/80">
              “{copy.text}”
            </div>
          )}
        </div>
      </div>

      {(voiceModeActive || textModeActive) && (
        <div className="shrink-0">
          {voiceModeActive && onVoiceBlob && (
            <MicButton onBlob={onVoiceBlob} onMicError={onMicError} />
          )}
          {textModeActive && onSubmitTurn && (
            <TurnInput onSubmit={onSubmitTurn} />
          )}
        </div>
      )}
    </div>
  );
}

function MicButton({
  onBlob,
  onMicError,
}: {
  onBlob: (blob: Blob, durationMs: number) => void;
  onMicError?: (kind: MicErrorKind, message: string) => void;
}) {
  const { isRecording, start, stop, error } = useMicCapture({
    onBlob,
    onError: onMicError,
  });

  function toggle() {
    if (isRecording) {
      stop();
    } else {
      void start();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        data-testid="mic-button"
        data-recording={isRecording}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={clsx(
          "flex h-16 w-16 items-center justify-center rounded-full text-cream shadow-lg transition-all",
          isRecording
            ? "scale-110 bg-red-500 shadow-red-500/40 hover:bg-red-600"
            : "bg-ink hover:bg-ink/85"
        )}
      >
        {isRecording ? (
          <span className="block h-5 w-5 rounded-sm bg-cream" />
        ) : (
          <MicIcon />
        )}
      </button>
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">
          {isRecording ? "Recording — tap to stop" : "Tap to talk"}
        </div>
        {error && (
          <div className="mt-1 text-xs text-red-700">{error}</div>
        )}
        {!error && (
          <p className="mt-1 text-[11px] text-mute">
            Max 30s · Sarvam Saarika · voice via Bulbul
          </p>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TurnInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      data-testid="turn-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full"
    >
      <div className="flex w-full items-end gap-2 rounded-xl border border-ink/[0.12] bg-white p-2 focus-within:border-ink/40">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Type your response… (Enter to send, Shift+Enter for newline)"
          aria-label="Type your response"
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-mute/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send response"
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send ↵
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-mute">
        Text mode · add a Sarvam key in onboarding to talk by voice
      </p>
    </form>
  );
}
