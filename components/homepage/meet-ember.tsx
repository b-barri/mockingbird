"use client";

import { useEffect, useRef } from "react";

// "Meet Ember" section — introduces the mascot by name. Brand doc
// (docs/brand/ember.md) is the source of truth for character + voice.
// Ember is the warmth in the room; Alex is the voice. They're distinct.
//
// The intro video autoplays muted+looping, but autoplay policies in some
// browsers defer until the element is intersecting. IntersectionObserver
// triggers play() on visibility for a reliable "scrolls into view, starts
// moving" experience.
export function MeetEmber() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && video.paused) {
            // Silently catch autoplay-blocked errors — the poster will stay visible
            // if the browser refuses, and the page still works.
            video.play().catch(() => {});
          }
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="ember"
      data-testid="meet-ember"
      className="mx-auto w-full max-w-[1440px] px-8 py-section"
    >
      <div className="ascii-rule mb-10 max-w-[680px]">
        ── BUDDY ────── EMBER ───────────────────────────────────
      </div>

      <div className="grid items-center gap-16 md:grid-cols-[1fr_1.1fr]">
        <div className="brand-video-glow w-full">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/branding/sitting.png"
            aria-label="Ember, the Mockingbird mascot, animated intro"
            className="w-full rounded-2xl bg-tan shadow-[0_24px_48px_-20px_rgba(26,22,18,0.40)] ring-1 ring-ink/[0.08]"
          >
            <source src="/branding/ember_intro.mp4" type="video/mp4" />
            Your browser doesn't support HTML5 video. Ember is sitting quietly
            instead.
          </video>
          <p className="mt-3 text-center font-mono text-[11px] text-mute">
            // ember &middot; intro loop
          </p>
        </div>

        <div>
          <h2 className="mb-6 font-display text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl">
            Meet Ember.
          </h2>

          <p className="mb-5 max-w-[520px] text-base leading-relaxed text-mute md:text-[17px]">
            Ember is the warmth in the room while{" "}
            <span className="font-medium text-ink">Alex</span> is the voice in
            the room. A small, lamp-lit creature who shows up where a PM
            candidate needs steadiness — first visits, between sessions, when
            something breaks.
          </p>

          <p className="max-w-[520px] text-base leading-relaxed text-mute md:text-[17px]">
            She doesn't cheer. She doesn't disclaim. She doesn't perform. She
            notices, and she's there.
          </p>
        </div>
      </div>
    </section>
  );
}
