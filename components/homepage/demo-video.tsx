"use client";

import { useState } from "react";

// Optional embedded video of an operator running a real case. Renders a
// graceful skeleton when no video is available so the homepage still works
// while the demo is being recorded pre-launch.

interface DemoVideoProps {
  /** Path or URL to the demo video. Leave undefined for skeleton state. */
  src?: string;
  /** Poster image shown before play. */
  poster?: string;
}

export function DemoVideo({ src, poster }: DemoVideoProps) {
  const [playing, setPlaying] = useState(false);

  if (!src) {
    return (
      <section
        data-testid="demo-video-skeleton"
        className="mx-auto mb-section max-w-2xl px-8"
      >
        <div className="flex aspect-video items-center justify-center rounded-[12px] border border-dashed border-white/[0.2] bg-tan">
          <div className="text-center">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-mute">
              Demo
            </div>
            <p className="text-xl text-ink-2">
              The demo recording is on its way. Back in a tick.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="demo-video"
      className="mx-auto mb-section max-w-2xl px-8"
    >
      <video
        controls
        className="aspect-video w-full rounded-[12px] border border-white/[0.08] bg-black"
        poster={poster}
        onPlay={() => setPlaying(true)}
      >
        <source src={src} />
        Your browser does not support embedded video. Watch it at {src}.
      </video>
      {!playing && (
        <p className="mt-3 text-center text-xs text-mute">
          About 3 min. One real Product Design case, end to end, no edits.
        </p>
      )}
    </section>
  );
}
