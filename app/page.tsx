// Placeholder hero for U1. U8 replaces this with the full marketing homepage
// (R1-R4) including the 4 feature blocks, demo video, and primary CTA.

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-8">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          <span className="h-2 w-2 rounded-full bg-coral shadow-[0_0_10px_rgba(232,93,59,0.4)]" />
          Mockingbird
        </div>
        <h1 className="font-display text-5xl leading-tight tracking-tight text-ink md:text-6xl">
          A PM interview prep buddy that talks back.
        </h1>
        <p className="mt-6 text-base text-mute">
          Voice-first Product Design case practice with framework-aware probes.
          Bring your own API keys. V1 scaffold in progress.
        </p>
      </div>
    </main>
  );
}
