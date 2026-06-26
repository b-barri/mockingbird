"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { Orb } from "./orb";
import { useMicCapture, type MicErrorKind } from "@/lib/voice/mic-capture";
import type { VoiceStateKind } from "@/lib/voice/types";

// Each of the five error states gets explicit copy and a recovery affordance.
// See lib/voice/state-machine.ts for the source-of-truth state values.
const ERROR_COPY: Record<
  string,
  { label: string; text: string; cta?: string; dotColor: string }
> = {
  "mic-permission-denied": {
    label: "Microphone needed",
    text: "Alex can't hear you. Allow microphone access to keep going.",
    cta: "Allow microphone access",
    dotColor: "bg-coral",
  },
  "network-drop": {
    label: "Reconnecting",
    text: "Connection dropped. Reconnecting now.",
    dotColor: "bg-mute",
  },
  "asr-no-result": {
    label: "Didn't catch that",
    text: "Didn't catch that. Say it again.",
    cta: "Try again",
    dotColor: "bg-mute",
  },
  "key-invalid": {
    label: "API key rejected",
    text: "Your provider rejected the key. Fix it in onboarding and come back.",
    cta: "Back to onboarding",
    dotColor: "bg-coral",
  },
  "provider-timeout": {
    label: "Taking a while",
    text: "Alex is taking longer than usual. Hang on.",
    cta: "Retry",
    dotColor: "bg-mute",
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
  listening: { label: "Listening", text: "Your turn. The clock is running." },
  thinking: { label: "Thinking", text: "" },
  speaking: { label: "Speaking", text: "" },
};

interface VoiceStageProps {
  state: VoiceStateKind;
  /** Current AI question shown in the question card. */
  currentQuestion?: string;
  /** Timer-only pause flag. Swaps the listening copy and hides the
   *  input affordance. In-flight LLM and TTS continue uninterrupted. */
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
  /** Toggle handler. Undefined when voice isn't available (text-only user),
   *  in which case the toggle is hidden. */
  onToggleInputMode?: () => void;
}

// Maps a provider to its STT and TTS attribution, shown as fine print under
// the mic button. Falls back to a generic line when the key is unrecognized,
// so the attribution never claims something that isn't running.
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
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-mute" />
            Ready to begin
          </div>
          <h2 className="font-sans text-2xl font-semibold tracking-[-0.02em] text-ink">
            Alex is on the line.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink-2">
            Press start. Alex greets you and reads your case. Then it's your
            turn. Clarify, segment, or sketch a solution out loud. Real
            interviewers don't wait long, and neither will Alex.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartInterview}
          data-testid="start-interview"
          className="pf-exec-btn"
        >
          Start the mock
          <span aria-hidden>→</span>
        </button>

        {/*
          Sleeping Ember lives on the persistent Mascot component (see
          three-panel.tsx). Mascot.frameFor returns "sleeping" while the
          session is idle, then transitions to "blinking" once the candidate
          starts. Keeping the mascot in one place keeps state transitions
          smooth in the same viewport corner.
        */}
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
              "mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mute"
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", copy.dotColor)} />
            {copy.label}
          </div>
          <div className="font-sans text-2xl font-semibold tracking-[-0.02em] text-ink">
            {copy.text}
          </div>
        </div>
        {copy.cta && (
          <button onClick={onErrorAction} className="pf-btn-ghost">
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
      {/* Input-mode toggle, a segmented pill at the top of the stage.
          Always visible when the parent provides a handler. The session
          page wraps the handler so clicking "Voice" without a configured
          voice key opens a mid-session key prompt instead of silently
          dropping the click. Switching takes effect on the next listening
          turn. */}
      {onToggleInputMode && (
        <div
          data-testid="toggle-input-mode"
          className="shrink-0 self-center inline-flex rounded-full border border-white/[0.08] bg-raised p-0.5 gap-0.5"
        >
          <button
            type="button"
            data-testid="toggle-voice"
            aria-pressed={inputMode === "voice"}
            onClick={() => {
              if (inputMode !== "voice") onToggleInputMode();
            }}
            className={clsx(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-quick",
              inputMode === "voice"
                ? "bg-coral text-white"
                : "text-mute hover:text-ink"
            )}
          >
            Voice
          </button>
          <button
            type="button"
            data-testid="toggle-text"
            aria-pressed={inputMode === "text"}
            onClick={() => {
              if (inputMode !== "text") onToggleInputMode();
            }}
            className={clsx(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-quick",
              inputMode === "text"
                ? "bg-coral text-white"
                : "text-mute hover:text-ink"
            )}
          >
            Text
          </button>
        </div>
      )}

      {/* The top section scrolls when the current question is long. The
          mic and text input below stay anchored, so the candidate never
          has to scroll to find the input affordance. */}
      <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto">
        {currentQuestion && (
          <div className="w-full shrink-0 rounded-[8px] border border-white/[0.08] bg-raised p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              Currently asking
            </div>
            <p className="font-sans text-xl font-semibold leading-snug tracking-[-0.02em] text-ink">
              {currentQuestion}
            </p>
          </div>
        )}
        <div className="shrink-0">
          <Orb state={state} />
        </div>
        <div className="shrink-0 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            <span
              className={clsx("pf-status-dot", paused ? "is-paused" : "is-live")}
            />
            {paused ? "Paused" : copy.label}
          </div>
          {paused && (
            <div className="font-sans text-lg text-ink-2">
              Paused. The clock is frozen. Resume when you're ready.
            </div>
          )}
          {!paused && copy.text && !voiceModeActive && !textModeActive && (
            <div className="font-sans text-lg text-ink-2">{copy.text}</div>
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
          "flex h-16 w-16 items-center justify-center rounded-full text-white transition-all duration-quick",
          isRecording
            ? "scale-110 bg-coral hover:bg-coral/90"
            : "bg-raised hover:bg-white/[0.08]"
        )}
      >
        {isRecording ? (
          <span className="block h-5 w-5 rounded-[3px] bg-white" />
        ) : (
          <MicIcon />
        )}
      </button>
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">
          {isRecording ? "Recording. Tap to stop" : "Tap to talk"}
        </div>
        {error && (
          <div className="mt-1 text-[11px] text-coral">{error}</div>
        )}
        {!error && (
          <p className="mt-1 text-[11px] text-mute">
            Up to 30s per turn · {providerAttribution(voiceProvider)}
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
      <div className="flex w-full items-end gap-2 rounded-[8px] border border-white/[0.08] bg-raised p-2 focus-within:border-white/[0.18]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Type your answer. Enter to send, Shift+Enter for a new line."
          aria-label="Type your response"
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send response"
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-coral px-3 py-2 text-[13px] font-medium text-white transition-colors duration-quick hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
          <kbd className="rounded-[4px] bg-white/20 px-1 text-[11px] leading-none">↵</kbd>
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-mute">
        Text mode. Add a Sarvam key in onboarding to answer out loud instead.
      </p>
    </form>
  );
}
