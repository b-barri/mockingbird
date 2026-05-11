# Mockingbird

PM interview voice agent. Voice-first Product Design case practice with framework-aware probes, BYO API keys, and a provider-pluggable voice layer that doubles as an empirical testbed for voice-AI providers.

Working name: **Mockingbird** (placeholder).

## Status

**V1 scaffold (U1)** — Next.js 15 + TypeScript + Tailwind + Vitest + Playwright initialized. Subsequent units land incrementally per the plan.

See [`docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md`](docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md) for the full V1 implementation plan, and [`docs/brainstorms/2026-05-11-pm-interview-voice-agent-requirements.md`](docs/brainstorms/2026-05-11-pm-interview-voice-agent-requirements.md) for the requirements that originated it.

## Develop

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:3000`.

## Test

```bash
pnpm typecheck   # TypeScript
pnpm test        # Vitest unit + component tests
pnpm test:e2e    # Playwright end-to-end (requires `pnpm install --filter` for browsers first run: `pnpm exec playwright install`)
pnpm build       # production build verification
```

## Configuration

Anonymous candidates bring their own API keys (LLM + voice provider) at onboarding — no environment configuration required to run a session. See [`.env.example`](.env.example) for the optional operator-only env vars (private framework library, dogfooding keys).

## Architecture

Web app, desktop-first. Mobile viewports under 1024px see an interstitial gate (R12) rather than a broken responsive layout. Three-panel session UI: transcript / voice stage / scratchpad. Voice provider abstraction is capability-tiered (`ComponentProvider` vs `AgentProvider`) so Cartesia, Sarvam, and ElevenLabs can ship behind the same surface.

Server-side LLM proxy via Next.js Edge runtime (Anthropic and OpenAI default-deny browser-origin calls in 2026 — see Key Technical Decisions in the plan).

## License

Private. Not yet open-sourced.
