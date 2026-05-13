// R2 reading order — fixed, with the rationale documented in
// docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md U8.
// Body copy ≤ 60 words per block. No generic SaaS verbs ("streamline,"
// "supercharge," "unlock"). Pre-flight Console direction: 2x2 mono grid
// with [01]·LABEL eyebrows, serif titles, mute body, coral hover accent.

interface FeatureBlock {
  title: string;
  body: string;
  tag: string;
}

export const FEATURE_BLOCKS: ReadonlyArray<FeatureBlock> = [
  {
    title: "Voice-native, like the real loop",
    body: "30 minutes. Spoken aloud. Alex asks, probes, and politely calls out the framework you skipped. You answer with your voice — no typing, no autocomplete to lean on. The transcript catches every “um” so you can review later. If you're brave.",
    tag: "VOICE",
  },
  {
    title: "Bring your own keys. No accounts.",
    body: "Paste your Anthropic or OpenAI key on the onboarding screen — plus a voice key if you've got one. Keys live in your browser, not on our servers. No signup, no Stripe, no “talk to sales.” Your spend goes to your provider, not us.",
    tag: "KEYS",
  },
  {
    title: "Framework-aware probes",
    body: "CIRCLES, AARM, JTBD, the goal-to-metric ladder — Alex knows them all. Skip the user segment? It'll ask. Jump straight to solutions? It'll walk you back. No “great answer, here's some feedback” — just the in-character follow-up you got at your last Meta loop.",
    tag: "PROBES",
  },
  {
    title: "Multi-provider voice bakeoff",
    body: "Cartesia and Sarvam — two voice providers, one abstraction, one practice surface. V1 ships the bakeoff winner; V1.1 lets you flip mid-session. Results post publicly so you can hear the difference, not just read the latency table.",
    tag: "BAKEOFF",
  },
];

export function FeatureBlocks() {
  return (
    <section
      data-testid="feature-blocks"
      className="mx-auto w-full max-w-[1440px] px-8 py-section"
    >
      <div className="ascii-rule mb-8 max-w-[680px]">
        ── WHY MOCKINGBIRD ──────────────────────────────────────
      </div>
      <h2 className="mb-12 max-w-2xl font-display text-3xl leading-tight tracking-tight text-ink md:text-4xl">
        What you actually get.
      </h2>

      <div className="grid gap-x-16 gap-y-14 md:grid-cols-2">
        {FEATURE_BLOCKS.map((block, idx) => (
          <article
            key={block.title}
            data-testid={`feature-block-${idx + 1}`}
            data-order={idx + 1}
            className="border-l-2 border-ink/[0.12] py-1 pl-6 transition-colors hover:border-coral"
          >
            <div className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-coral">
              [{String(idx + 1).padStart(2, "0")}] · {block.tag}
            </div>
            <h3 className="mb-3 font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl">
              {block.title}
            </h3>
            <p className="text-base leading-relaxed text-mute">{block.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
