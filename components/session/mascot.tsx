"use client";

import Image from "next/image";
import type { VoiceStateKind } from "@/lib/voice/types";

interface MascotProps {
  state: VoiceStateKind;
}

// Voice-state → mascot frame. The mascot is sleeping while the session is
// idle (pre-start), blinks once the candidate is on the line (waiting), and
// switches to the post-response reaction when Alex is thinking or replying.
function frameFor(state: VoiceStateKind): "sleeping" | "blinking" | "post" {
  switch (state) {
    case "idle":
      return "sleeping";
    case "thinking":
    case "speaking":
      return "post";
    case "listening":
    default:
      return "blinking";
  }
}

const FRAME_SOURCES: Record<
  "sleeping" | "blinking" | "post",
  { src: string; alt: string }
> = {
  sleeping: {
    src: "/branding/sleeping.png",
    alt: "Mockingbird mascot sleeping, waiting for the session to start",
  },
  blinking: {
    src: "/branding/blinking.gif",
    alt: "Mockingbird mascot blinking, listening",
  },
  post: {
    src: "/branding/post_response.gif",
    alt: "Mockingbird mascot reacting to your answer",
  },
};

export function Mascot({ state }: MascotProps) {
  const frame = frameFor(state);
  const { src, alt } = FRAME_SOURCES[frame];

  return (
    <div
      data-testid="session-mascot"
      data-frame={frame}
      className="brand-image-glow pointer-events-none fixed bottom-3 right-3 z-30 h-20 w-20 rounded-2xl shadow-[0_18px_40px_-18px_rgba(26,22,18,0.45)] ring-1 ring-ink/[0.08] sm:bottom-5 sm:right-5 sm:h-32 sm:w-32 md:h-40 md:w-40"
    >
      <Image
        key={frame}
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="160px"
        className="rounded-2xl object-cover"
      />
    </div>
  );
}
