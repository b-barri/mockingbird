# Linear-direction conversion spec

We are migrating this app from the warm "Pre-flight Console" terminal aesthetic
to **Linear's design direction**: a near-black dark UI, Inter typography, tight
spacing, restraint — but with **coral (#E85D3B) kept as the single accent** where
Linear would use indigo. Assets (images, video, mascot) stay unchanged.

The token + shared-class foundation is already done (`tailwind.config.ts`,
`app/globals.css`). Your job: convert individual components' **copy** and
**inline styling** to match. Keep each component's behavior and structure; change
voice and visuals only.

## Token meanings (IMPORTANT — names were kept but values inverted)

| token | now resolves to | use on dark |
|---|---|---|
| `cream` | #08090A near-black | page/base background — fine as a bg; never as "light card" |
| `tan` | #141517 | panel/card surface |
| `raised` | #18191B | inputs, menus, popovers |
| `ink` | #F7F8F8 off-white | **primary text** — keep `text-ink` for headings/body |
| `ink-2` | #9CA0A8 | secondary text |
| `mute` | #8A8F98 | muted labels/meta |
| `ink-faint` | #5C5F66 | disabled/faint |
| `coral` | #E85D3B | the accent — unchanged |

### Inversion gotchas — FIX these where you see them
- `bg-ink` → now OFF-WHITE → almost always WRONG (was a dark button/surface).
  - Dark surface intent → `bg-tan`, `bg-raised`, or `bg-white/[0.03]`.
  - Primary CTA intent → use the `.pf-exec-btn` class (filled coral).
- `text-cream` → now NEAR-BLACK → WRONG when it was light text on a dark/colored
  surface → replace with `text-white` (on coral) or `text-ink` (on dark).
- `bg-coral … text-cream` → change to `text-white`.
- `border-ink/NN` / `ring-ink/NN` → resolves to a faint WHITE hairline on dark →
  this is actually FINE; leave or rename to `border-white/NN` for clarity.
- Shadows using `rgba(26,22,18,x)` (dark-on-light) → on dark use
  `rgba(0,0,0, 0.4–0.6)` (stronger black).

## Visual conversions
- `font-display` (Instrument Serif) → `font-sans`. For headings add
  `font-semibold tracking-[-0.02em]` (Linear's tight Inter look). NEVER serif.
- `font-mono` used as UI chrome → remove (plain sans). Mono may remain ONLY for
  genuine code, API-key values, or a live timer — and even then sparingly.
- Radii: `rounded-[3px]`/`rounded-md` → `rounded-[8px]`; `rounded-[2px]` →
  `rounded-[6px]`; large hero radii (`rounded-2xl`) are fine.
- Keep `pulse-dot`, `.pf-*` classes, `animate-*` as-is (already restyled).

## Copy conversions (terminal tropes → Linear voice)
- `── SOME_LABEL ──` ASCII dividers: strip the dashes and underscores. Keep the
  `ascii-rule` class (it now renders a quiet uppercase eyebrow) and put plain
  sentence-case text, e.g. `<div className="ascii-rule">Anatomy of a session</div>`.
- `// machine comment` lines: rewrite as a plain sentence (drop the `//`).
- Terminal glyphs `▸`, `↵` (as decoration), blinking `_`, `>` prompts, `▋`:
  remove. A real keyboard hint can keep a `kbd` chip (e.g. `↵` to submit).
- UPPER_SNAKE_CASE labels and `mockingbird_` style: use normal sentence case
  ("Mockingbird", "Anatomy of a session").

## Voice (the "re-write all copies" ask)
Rewrite all user-facing copy in Linear's voice:
- **Sentence case.** Confident, calm, concrete. No hype words, no terminal/machine
  cosplay, no exclamation spam.
- **No em-dashes (—).** Use a period or comma instead.
- Keep the product's substance and the warm Ember/lamplight personality, just say
  it plainly. Short sentences. Lead with the value.
- Preserve all real information (key handling, costs, steps, BYO-key, etc.).

## Gold-standard reference: the converted hero (already done)
- Eyebrow: a pill — `<span className="pulse-dot" /> Mockingbird` (no `> _`).
- Headline: `text-ink font-semibold tracking-[-0.022em]`, Inter, not serif.
- Body: `text-ink-2`, sentence case, "Bring your own API key. No accounts, no
  payments, no \"book a demo.\""
- Primary CTA: `.pf-exec-btn` filled coral, label + a single `→`, no blinking caret.
- Image caption: plain "Ember and you, by lamplight." (no `//`, no mono).

## When done
- Run `npx tsc --noEmit` from the project root and fix any type errors you caused.
- If you changed a copy string that a test asserts on (check `__tests__`,
  `test/`, `tests/`), update the test to match.
- Do NOT touch files outside your assigned list.
