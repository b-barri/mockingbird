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
      <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
          Transcript
        </span>
        <button
          className="font-sans text-xs text-mute hover:text-ink"
          aria-label="Copy transcript"
        >
          Copy ↗
        </button>
      </div>
      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        data-testid="transcript-body"
      >
        {turns.length === 0 && (
          <p className="py-4 text-sm italic text-mute">
            Conversation will appear here as you speak.
          </p>
        )}
        {turns.map((turn) => (
          <article
            key={turn.id}
            data-testid={`turn-${turn.id}`}
            data-stricken={turn.stricken}
            data-partial={turn.partial}
            className="group py-2.5"
          >
            <header className="mb-1 flex items-center gap-2">
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase tracking-[0.14em]",
                  turn.speaker === "user" ? "text-coral" : "text-mute"
                )}
              >
                {turn.speaker === "user" ? "You" : "Interviewer"}
              </span>
              {turn.partial && (
                <span className="text-[10px] italic text-mute">typing…</span>
              )}
              <button
                type="button"
                onClick={() => onStrikeTurn(turn.id)}
                className="ml-auto rounded text-[10px] text-mute opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
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
