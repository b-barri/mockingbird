"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "./mascot";
import { ScratchpadPanel } from "./scratchpad-panel";
import { TranscriptPanel } from "./transcript-panel";
import { VoiceStage } from "./voice-stage";
import type { MicErrorKind } from "@/lib/voice/mic-capture";
import type { SessionAction, SessionSnapshot } from "@/lib/voice/state-machine";

interface ThreePanelProps {
  session: SessionSnapshot;
  dispatch: (action: SessionAction) => void;
  /** Case shown in the top bar. */
  caseTitle: string;
  /** Current AI question for the voice stage card. */
  currentQuestion?: string;
  /** End-session handler routed by the orchestrator. */
  onEndSession?: () => void;
  /** Active voice provider — passed through to VoiceStage for mic attribution. */
  voiceProvider?: string;
  /** Start-interview handler routed by the orchestrator (idle → opening). */
  onStartInterview?: () => void;
  /** V1-preview text-input submit handler routed to the voice stage. */
  onSubmitTurn?: (text: string) => void;
  /** Voice-mode submit (mic blob from push-to-talk recording). */
  onVoiceBlob?: (blob: Blob, durationMs: number) => void;
  /** Forwarded to VoiceStage for getUserMedia error reporting. */
  onMicError?: (kind: MicErrorKind, message: string) => void;
  /** Error CTA handler (e.g., re-route to onboarding on key-invalid). */
  onErrorAction?: () => void;
  /** User-controlled input mode for the session ("voice" or "text"). */
  inputMode?: "voice" | "text";
  /** Toggle between voice and text input. Undefined when voice isn't
   *  available (candidate didn't configure a voice key) — the toggle
   *  is hidden in that case. */
  onToggleInputMode?: () => void;
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Three-panel session screen layout. Implements R7 (three regions) and R8
// (scratchpad collapsible, 2:3 ratio when collapsed). Voice stage + transcript
// + scratchpad are siblings under a CSS grid that retargets columns based
// on the scratchpadCollapsed flag on the session snapshot.
export function ThreePanel({
  session,
  dispatch,
  caseTitle,
  currentQuestion,
  onEndSession,
  onStartInterview,
  onSubmitTurn,
  onVoiceBlob,
  onMicError,
  onErrorAction,
  voiceProvider,
  inputMode,
  onToggleInputMode,
}: ThreePanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  // Total wall-clock time spent paused so far; subtracted from elapsed.
  const totalPausedMsRef = useRef(0);
  // Wall-clock timestamp of the current pause, or null if not paused.
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session.startedAt || session.endedAt || paused) return;
    const interval = setInterval(() => {
      setElapsedMs(
        Date.now() - session.startedAt! - totalPausedMsRef.current
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt, session.endedAt, paused]);

  function togglePause() {
    if (paused) {
      if (pauseStartRef.current !== null) {
        totalPausedMsRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setPaused(true);
    }
  }

  const canPause = Boolean(session.startedAt) && !session.endedAt;

  return (
    <div className="flex min-h-screen flex-col bg-cream md:h-screen">
      {/* TOP BAR — Pre-flight Console direction: pulse-dot brand, mono case
          label, mono timer pill, mono control buttons. Wraps on mobile so
          the case title gets its own line, keeping controls reachable. */}
      <header className="flex flex-col gap-2 border-b border-ink/10 bg-cream px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:gap-6">
          <div className="flex items-baseline gap-3">
            <span className="pulse-dot" />
            <span className="font-mono text-[13px] font-semibold tracking-wide text-ink">
              MOCKINGBIRD
            </span>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-[11px] text-mute">
              [SESSION]&nbsp;<span className="text-coral">LIVE</span>&nbsp;//
            </span>
            <span className="truncate font-mono text-[13px] font-semibold tracking-tight text-ink sm:text-[14px]">
              {caseTitle}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[12px] text-mute">
            <span className="text-[10px] uppercase tracking-[0.14em]">
              elapsed
            </span>
            <span className="tabular-nums text-ink">
              [ {formatTimer(elapsedMs)} ]
            </span>
          </div>
          <button
            type="button"
            onClick={togglePause}
            disabled={!canPause}
            data-testid="pause-toggle"
            data-paused={paused}
            aria-pressed={paused}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-ink/20 bg-cream px-2.5 py-[6px] font-mono text-[12px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-[7px]"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            type="button"
            onClick={onEndSession}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-red-900/30 bg-cream px-2.5 py-[6px] font-mono text-[12px] text-red-900 transition-colors hover:border-red-900 hover:bg-red-50 sm:px-3 sm:py-[7px]"
          >
            ▸ End session
          </button>
        </div>
      </header>

      {/* PANELS — mobile: flex column, voice first; desktop: 2- or 3-col grid. */}
      <main
        data-testid="three-panel-grid"
        data-scratchpad-collapsed={session.scratchpadCollapsed}
        className={clsx(
          "flex flex-1 flex-col gap-4 p-3 sm:p-4 md:grid md:overflow-hidden md:transition-[grid-template-columns] md:duration-200 md:ease-out",
          // R8 ratios: default 35/30/35; collapsed 40/60 (2:3 transcript:voice)
          session.scratchpadCollapsed
            ? "md:grid-cols-[2fr_3fr]"
            : "md:grid-cols-[1fr_1.1fr_1.2fr]"
        )}
      >
        {/* Voice stage is order-1 on mobile (the action surface), middle on desktop. */}
        <section className="order-1 min-h-[26rem] overflow-hidden rounded-xl border border-ink/[0.08] bg-white md:order-2 md:min-h-0">
          <VoiceStage
            state={session.state.kind}
            currentQuestion={currentQuestion}
            paused={paused}
            onStartInterview={onStartInterview}
            onSubmitTurn={paused ? undefined : onSubmitTurn}
            onVoiceBlob={paused ? undefined : onVoiceBlob}
            onMicError={onMicError}
            onErrorAction={onErrorAction}
            voiceProvider={voiceProvider}
            inputMode={inputMode}
            onToggleInputMode={onToggleInputMode}
          />
        </section>
        <section className="order-2 min-h-[18rem] overflow-hidden rounded-xl border border-ink/[0.08] bg-white md:order-1 md:min-h-0">
          <TranscriptPanel
            turns={session.turns}
            onStrikeTurn={(id) => dispatch({ type: "STRIKE_TURN", id })}
          />
        </section>
        {!session.scratchpadCollapsed && (
          <section className="order-3 min-h-[16rem] overflow-hidden rounded-xl border border-ink/[0.08] bg-white md:min-h-0">
            <ScratchpadPanel
              value={session.scratchpad}
              onChange={(text) =>
                dispatch({ type: "SCRATCHPAD_UPDATE", text })
              }
              collapsed={session.scratchpadCollapsed}
              onToggleCollapsed={(collapsed) =>
                dispatch({ type: "SCRATCHPAD_COLLAPSE", collapsed })
              }
            />
          </section>
        )}
      </main>

      {/* COLLAPSED-STATE EXPAND BUTTON — appears when scratchpad is hidden.
          Pinned lower-left on mobile so it doesn't fight the mascot for the
          bottom-right; original right-side placement holds on desktop. */}
      {session.scratchpadCollapsed && (
        <button
          type="button"
          onClick={() => dispatch({ type: "SCRATCHPAD_COLLAPSE", collapsed: false })}
          className="fixed bottom-4 left-4 z-10 rounded-full border border-ink/[0.1] bg-white px-3 py-2 text-xs font-medium text-mute shadow-lg hover:text-ink md:bottom-[12.5rem] md:left-auto md:right-6 md:px-4 md:py-2.5"
          aria-label="Show scratchpad"
        >
          Show scratchpad ↗
        </button>
      )}

      {/* Persistent branded mascot. Reacts to the voice state machine —
          blinks while waiting for the candidate, switches to the post-
          response reaction the moment they hand the turn back to Alex. */}
      <Mascot state={session.state.kind} />
    </div>
  );
}
