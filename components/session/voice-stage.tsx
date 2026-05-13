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
    text: "Microphone access needed — Alex can't hear you yet.",
    cta: "Grant microphone access",
    dotColor: "bg-red-500",
  },
  "network-drop": {
    label: "Reconnecting",
    text: "Connection lost — reconnecting… (real interviews don't get to do this)",
    dotColor: "bg-amber-500",
  },
  "asr-no-result": {
    label: "Didn't catch that",
    text: "Static won that round. Say it again?",
    cta: "Try again",
    dotColor: "bg-amber-500",
  },
  "key-invalid": {
    label: "API key invalid",
    text: "Your provider just rejected the key. Two clicks back to fix it.",
    cta: "Return to onboarding",
    dotColor: "bg-red-500",
  },
  "provider-timeout": {
    label: "Taking longer than usual",
    text: "Alex is thinking longer than usual. (Honestly, very on-brand.)",
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
  idle: { label: "Idle", text: "Ready when you are." },
  listening: { label: "Listening", text: "Take your time. (But you're on the clock.)" },
  thinking: { label: "Thinking", text: "" },
  speaking: { label: "Speaking", text: "" },
};

interface VoiceStageProps {
  state: VoiceStateKind;
  /** Current AI question shown in the question card. */
  currentQuestion?: string;
  /** Timer-only pause flag. Swaps the listening copy and hides the
   *  input affordance — in-flight LLM/TTS continue uninterrupted. */
  paused?: boolean;
  /** Recovery CTA handler when the state has one. */
  onErrorAction?: () => void;
  /**
   * Idle-state CTA. Click triggers the LLM-generated opening turn. Also
   * provides the user gesture browsers require before audio.play() works.
   */
  onStartInterview?: () => void;
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
  /** Active voice provider — drives the STT/TTS attribution under the mic button. */
  voiceProvider?: string;
  /** User-controlled input mode. When provided, the toggle link renders below
   *  the input affordance so the candidate can switch mid-session. */
  inputMode?: "voice" | "text";
  /** Toggle handler. Undefined when voice isn't available (text-only user) —
   *  the toggle is hidden in that case. */
  onToggleInputMode?: () => void;
}

// Provider → (STT model name, TTS model name) attribution. Used as
// fine-print under the mic button. Falls back to "your provider" when
// the key is unrecognized, so the line never lies about what's running.
function providerAttribution(voiceProvider?: string): string {
  switch (voiceProvider) {
    case "sarvam":
      return "STT by Saarika · voice by Bulbul";
    case "cartesia":
      return "STT by Ink-Whisper · voice by Sonic-2";
    case "elevenlabs":
      return "voice by ElevenLabs";
    default:
      return "powered by your voice provider";
  }
}

export function VoiceStage({
  state,
  currentQuestion,
  paused = false,
  onErrorAction,
  onStartInterview,
  onSubmitTurn,
  onVoiceBlob,
  onMicError,
  voiceProvider,
  inputMode,
  onToggleInputMode,
}: VoiceStageProps) {
  const isError = state in ERROR_COPY;

  if (state === "idle" && onStartInterview) {
    return (
      <div
        data-testid="voice-stage-idle"
        data-state="idle"
        className="flex h-full flex-col items-center justify-center gap-7 p-8 text-center"
      >
        <Orb state="idle" />
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-mute" />
            Pre-flight
          </div>
          <h2 className="font-display text-2xl tracking-tight text-ink">
            Alex is on the line.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-mute">
            Hit start, Alex says hi and reads your case. Then you're on —
            clarify, segment, or start sketching out loud. Real interviewers
            don't wait. Alex will, briefly.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartInterview}
          data-testid="start-interview"
          className="rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink/85"
        >
          Start the mock →
        </button>
      </div>
    );
  }

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
      {/* Input-mode toggle — segmented pill, always visible at the top of
          the stage when the candidate has a voice key configured. Switching
          mid-session takes effect on the next listening turn. Hidden for
          text-only candidates (no onToggleInputMode means no voice key was
          configured at onboarding, so there's nothing to switch to). */}
      {onToggleInputMode && (
        <div
          data-testid="toggle-input-mode"
          className="shrink-0 self-center inline-flex rounded-full border border-ink/[0.12] bg-cream/70 p-0.5 gap-0.5"
        >
          <button
            type="button"
            data-testid="toggle-voice"
            aria-pressed={inputMode === "voice"}
            onClick={() => {
              if (inputMode !== "voice") onToggleInputMode();
            }}
            className={clsx(
              "rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
              inputMode === "voice"
                ? "bg-ink text-cream"
                : "text-mute hover:text-ink"
            )}
          >
            🎤 Voice
          </button>
          <button
            type="button"
            data-testid="toggle-text"
            aria-pressed={inputMode === "text"}
            onClick={() => {
              if (inputMode !== "text") onToggleInputMode();
            }}
            className={clsx(
              "rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
              inputMode === "text"
                ? "bg-ink text-cream"
                : "text-mute hover:text-ink"
            )}
          >
            ⌨ Text
          </button>
        </div>
      )}

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
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                paused
                  ? "bg-amber-500"
                  : "animate-pulse bg-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.2)]"
              )}
            />
            {paused ? "Paused" : copy.label}
          </div>
          {paused && (
            <div className="font-display text-lg italic text-ink/80">
              “Take a breath. The clock is frozen.”
            </div>
          )}
          {!paused && copy.text && !voiceModeActive && !textModeActive && (
            <div className="font-display text-lg italic text-ink/80">
              “{copy.text}”
            </div>
          )}
        </div>
      </div>

      {(voiceModeActive || textModeActive) && (
        <div className="shrink-0">
          {voiceModeActive && onVoiceBlob && (
            <MicButton
              onBlob={onVoiceBlob}
              onMicError={onMicError}
              voiceProvider={voiceProvider}
            />
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
  voiceProvider,
}: {
  onBlob: (blob: Blob, durationMs: number) => void;
  onMicError?: (kind: MicErrorKind, message: string) => void;
  voiceProvider?: string;
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
            Up to 30s a turn · {providerAttribution(voiceProvider)}
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
          placeholder="Type your answer… (Enter to send · Shift+Enter for a new line)"
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
        Text mode. Add a Sarvam key in onboarding if you'd rather say it out loud.
      </p>
    </form>
  );
}
