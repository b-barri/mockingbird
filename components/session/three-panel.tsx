"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
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
  /** V1-preview text-input submit handler routed to the voice stage. */
  onSubmitTurn?: (text: string) => void;
  /** Voice-mode submit (mic blob from push-to-talk recording). */
  onVoiceBlob?: (blob: Blob, durationMs: number) => void;
  /** Forwarded to VoiceStage for getUserMedia error reporting. */
  onMicError?: (kind: MicErrorKind, message: string) => void;
  /** Error CTA handler (e.g., re-route to onboarding on key-invalid). */
  onErrorAction?: () => void;
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
  onSubmitTurn,
  onVoiceBlob,
  onMicError,
  onErrorAction,
}: ThreePanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!session.startedAt || session.endedAt) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - session.startedAt!);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt, session.endedAt]);

  return (
    <div className="flex h-screen flex-col bg-cream">
      {/* TOP BAR */}
      <header className="flex items-center justify-between border-b border-ink/[0.07] bg-cream px-7 py-[18px]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 font-display text-2xl tracking-tight">
            <span className="h-2.5 w-2.5 rounded-full bg-coral shadow-[0_0_12px_rgba(232,93,59,0.4)]" />
            Mockingbird
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
              Product Design · Google/Meta PM
            </span>
            <span className="text-sm font-medium text-ink">{caseTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-ink/[0.08] bg-white px-3.5 py-1.5 font-mono text-[15px] font-semibold tabular-nums">
            {formatTimer(elapsedMs)}
          </div>
          <button
            type="button"
            className="rounded-lg border border-ink/[0.12] bg-white px-3.5 py-2 text-[13px] font-medium"
          >
            ⏸ Pause
          </button>
          <button
            type="button"
            onClick={onEndSession}
            className="rounded-lg border border-red-900/20 bg-white px-3.5 py-2 text-[13px] font-medium text-red-900 hover:bg-red-50"
          >
            End session
          </button>
        </div>
      </header>

      {/* THREE PANELS */}
      <main
        data-testid="three-panel-grid"
        data-scratchpad-collapsed={session.scratchpadCollapsed}
        className={clsx(
          "grid flex-1 gap-4 overflow-hidden p-4 transition-[grid-template-columns] duration-200 ease-out",
          // R8 ratios: default 35/30/35; collapsed 40/60 (2:3 transcript:voice)
          session.scratchpadCollapsed
            ? "grid-cols-[2fr_3fr]"
            : "grid-cols-[1fr_1.1fr_1.2fr]"
        )}
      >
        <section className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
          <TranscriptPanel
            turns={session.turns}
            onStrikeTurn={(id) => dispatch({ type: "STRIKE_TURN", id })}
          />
        </section>
        <section className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
          <VoiceStage
            state={session.state.kind}
            currentQuestion={currentQuestion}
            onSubmitTurn={onSubmitTurn}
            onVoiceBlob={onVoiceBlob}
            onMicError={onMicError}
            onErrorAction={onErrorAction}
          />
        </section>
        {!session.scratchpadCollapsed && (
          <section className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
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

      {/* COLLAPSED-STATE EXPAND BUTTON — appears when scratchpad is hidden */}
      {session.scratchpadCollapsed && (
        <button
          type="button"
          onClick={() => dispatch({ type: "SCRATCHPAD_COLLAPSE", collapsed: false })}
          className="fixed bottom-6 right-6 z-10 rounded-full border border-ink/[0.1] bg-white px-4 py-2.5 text-xs font-medium text-mute shadow-lg hover:text-ink"
          aria-label="Show scratchpad"
        >
          Show scratchpad ↗
        </button>
      )}
    </div>
  );
}
