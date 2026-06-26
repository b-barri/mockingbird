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
      {/* Panel header: section eyebrow and a meta row. */}
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <div className="ascii-rule mb-2">Transcript</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
            {turns.length} turns
          </span>
          <button
            className="text-[12px] text-mute transition-colors hover:text-ink"
            aria-label="Copy transcript"
          >
            Copy
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        data-testid="transcript-body"
      >
        {turns.length === 0 && (
          <p className="py-4 text-[13px] text-mute">
            Your conversation shows up here as you go. Strike out any turn you
            want the score to ignore.
          </p>
        )}
        {turns.map((turn) => (
          <article
            key={turn.id}
            data-testid={`turn-${turn.id}`}
            data-stricken={turn.stricken}
            data-partial={turn.partial}
            className="group border-b border-white/[0.06] py-2.5 last:border-b-0"
          >
            <header className="mb-1 flex items-center gap-2">
              <span
                className={clsx(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  turn.speaker === "user" ? "text-ink" : "text-coral"
                )}
              >
                {turn.speaker === "user" ? "You" : "Interviewer"}
              </span>
              {turn.partial && (
                <span className="text-[11px] text-mute">typing…</span>
              )}
              <button
                type="button"
                onClick={() => onStrikeTurn(turn.id)}
                className="ml-auto rounded text-[11px] text-mute opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
                aria-label={
                  turn.stricken ? "Restore turn" : "Strike out this turn"
                }
              >
                {turn.stricken ? "Restore" : "Strike"}
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
