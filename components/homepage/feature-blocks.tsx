// R2 reading order — fixed, with the rationale documented in
// docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md U8.
// Body copy ≤ 60 words per block. No generic SaaS verbs ("streamline,"
// "supercharge," "unlock").

interface FeatureBlock {
  title: string;
  body: string;
}

export const FEATURE_BLOCKS: ReadonlyArray<FeatureBlock> = [
  {
    title: "Voice-native interview",
    body: "Run a real 30-minute Product Design case spoken aloud. The interviewer asks, probes, and pushes back. You answer with your voice, not by typing. The transcript captures it all so you can review every word later.",
  },
  {
    title: "Bring your own API key",
    body: "Mockingbird never holds your provider keys. You paste your Anthropic or OpenAI key plus a voice provider key on the onboarding screen. Keys live in your browser. No accounts, no signups, no managed-key fallback in V1.",
  },
  {
    title: "Framework-aware probes",
    body: "The interviewer knows CIRCLES, AARM, and the other common PM frameworks. When you skip a step, it asks the missing question — the way a real interviewer would. Not a feedback statement; a follow-up probe in character.",
  },
  {
    title: "Multi-provider voice testbed",
    body: "Cartesia, Sarvam, and ElevenLabs all ship behind one capability-tiered abstraction. V1 picks the bakeoff winner; V1.1 lets you switch. The bakeoff results post publicly so you can hear the difference, not just read the numbers.",
  },
];

export function FeatureBlocks() {
  return (
    <section
      data-testid="feature-blocks"
      className="mx-auto max-w-2xl px-8 pb-section"
    >
      <div className="grid gap-section">
        {FEATURE_BLOCKS.map((block, idx) => (
          <article
            key={block.title}
            data-testid={`feature-block-${idx + 1}`}
            data-order={idx + 1}
          >
            <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-coral">
              {String(idx + 1).padStart(2, "0")}
            </div>
            <h2 className="mb-3 font-display text-3xl tracking-tight text-ink md:text-4xl">
              {block.title}
            </h2>
            <p className="text-base leading-relaxed text-mute">{block.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
