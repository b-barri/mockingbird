"use client";

import { useEffect, useRef } from "react";

// "Meet Ember" section — introduces the mascot by name. The brand doc
// (docs/brand/ember.md) is the source of truth for character and voice.
// Ember is the warmth in the room; Alex is the voice. They're distinct.
//
// The intro video autoplays muted and looping, but autoplay policies in some
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
            // Silently catch autoplay-blocked errors. The poster stays visible
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
      className="mx-auto w-full max-w-[1440px] px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="ascii-rule mb-8 max-w-[680px] sm:mb-10">
        Meet Ember
      </div>

      <div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
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
            className="w-full rounded-2xl bg-tan shadow-[0_24px_48px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.08]"
          >
            <source src="/branding/ember_intro.mp4" type="video/mp4" />
            Your browser doesn't support HTML5 video. Ember is sitting quietly
            instead.
          </video>
          <p className="mt-3 text-center text-[12px] text-mute">
            Ember, intro loop.
          </p>
        </div>

        <div>
          <h2 className="mb-5 text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl sm:leading-[1.02] md:text-5xl">
            Meet Ember.
          </h2>

          <p className="mb-5 max-w-[520px] text-base leading-relaxed text-ink-2 md:text-[17px]">
            Ember is the warmth in the room.{" "}
            <span className="font-medium text-ink">Alex</span> is the voice. A
            small, lamp-lit creature who turns up when a PM candidate needs
            steadiness: first visit, between sessions, when something breaks.
          </p>

          <p className="max-w-[520px] text-base leading-relaxed text-ink-2 md:text-[17px]">
            She doesn't cheer. She doesn't disclaim. She doesn't perform. She
            notices, and she stays.
          </p>
        </div>
      </div>
    </section>
  );
}
