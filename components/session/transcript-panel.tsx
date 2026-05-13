import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import type { Turn } from "@/lib/voice/state-machine";

interface TranscriptPanelProps {
  turns: ReadonlyArray<Turn>;
  /** R11: toggle strike-through on a turn. */
  onStrikeTurn: (id: string) => void;
}

export function TranscriptPanel({ turns, onStrikeTurn }: TranscriptPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest turn whenever turn count changes.
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [turns.length]);

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      data-testid="transcript-panel"
    >
      {/* Pre-flight Console panel header: ASCII rule + mono meta row */}
      <div className="border-b border-ink/[0.06] px-5 py-3.5">
        <div className="ascii-rule mb-2">
          ── TRANSCRIPT ──────────────────────────────────
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            turns &middot; {turns.length}
          </span>
          <button
            className="font-mono text-[11px] text-mute hover:text-ink"
            aria-label="Copy transcript"
          >
            copy ↗
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        data-testid="transcript-body"
      >
        {turns.length === 0 && (
          <p className="py-4 font-mono text-[12px] italic text-mute">
            // conversation will appear here. tap a turn to strike it out —
            alex won&apos;t notice.
          </p>
        )}
        {turns.map((turn) => (
          <article
            key={turn.id}
            data-testid={`turn-${turn.id}`}
            data-stricken={turn.stricken}
            data-partial={turn.partial}
            className="group border-b border-dashed border-ink/[0.10] py-2.5 last:border-b-0"
          >
            <header className="mb-1 flex items-center gap-2">
              <span
                className={clsx(
                  "font-mono text-[11px] font-semibold uppercase tracking-[0.14em]",
                  turn.speaker === "user" ? "text-ink" : "text-coral"
                )}
              >
                {turn.speaker === "user" ? "You" : "Interviewer"}
              </span>
              {turn.partial && (
                <span className="font-mono text-[10px] italic text-mute">
                  typing…
                </span>
              )}
              <button
                type="button"
                onClick={() => onStrikeTurn(turn.id)}
                className="ml-auto rounded font-mono text-[10px] text-mute opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
                aria-label={
                  turn.stricken ? "Restore turn" : "Strike out this turn"
                }
              >
                {turn.stricken ? "↺ restore" : "✕ strike"}
              </button>
            </header>
            <p
              className={clsx(
                "text-sm leading-relaxed text-ink",
                turn.stricken && "text-mute line-through opacity-60"
              )}
            >
              {turn.text}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
