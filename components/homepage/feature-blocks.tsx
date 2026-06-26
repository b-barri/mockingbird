// Reading order is fixed, with the rationale documented in
// docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md U8.
// Body copy stays under 60 words per block. No generic SaaS verbs
// ("streamline," "supercharge," "unlock"). A 2x2 grid with numbered
// eyebrows, tight Inter titles, secondary body, coral hover accent.

interface FeatureBlock {
  title: string;
  body: string;
  tag: string;
}

export const FEATURE_BLOCKS: ReadonlyArray<FeatureBlock> = [
  {
    title: "Spoken, like the real thing",
    body: "30 minutes, out loud. The interviewer cuts in, probes, and calls the framework you skipped. No typing, no autocomplete to hide behind. The transcript catches every “um” for later, if you're brave.",
    tag: "Voice",
  },
  {
    title: "Your keys. Your spend. No account.",
    body: "Paste an Anthropic or OpenAI key, plus a voice key if you have one. They stay in your browser, never our servers. No signup, no Stripe, no “talk to sales.” The bill goes to your provider, not us.",
    tag: "Keys",
  },
  {
    title: "It knows your frameworks",
    body: "CIRCLES, AARM, JTBD, the goal-to-metric ladder. Skip the user segment and it asks. Jump straight to solutions and it walks you back. Not “great answer, here's some feedback,” the in-character follow-up from your last Meta loop.",
    tag: "Probes",
  },
  {
    title: "Two voices. Pick yours.",
    body: "Cartesia and Sarvam behind one surface. Hear the difference yourself instead of reading a latency table.",
    tag: "Voices",
  },
];

export function FeatureBlocks() {
  return (
    <section
      data-testid="feature-blocks"
      className="mx-auto w-full max-w-[1440px] px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="ascii-rule mb-8 max-w-[680px]">
        Why Mockingbird
      </div>
      <h2 className="mb-10 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-3xl md:mb-12 md:text-4xl">
        What you actually get.
      </h2>

      <div className="grid gap-x-10 gap-y-10 sm:gap-y-14 md:grid-cols-2 md:gap-x-16">
        {FEATURE_BLOCKS.map((block, idx) => (
          <article
            key={block.title}
            data-testid={`feature-block-${idx + 1}`}
            data-order={idx + 1}
            className="border-l-2 border-white/[0.12] py-1 pl-6 transition-colors hover:border-coral"
          >
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-coral">
              {String(idx + 1).padStart(2, "0")} · {block.tag}
            </div>
            <h3 className="mb-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink md:text-3xl">
              {block.title}
            </h3>
            <p className="text-base leading-relaxed text-ink-2">{block.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
