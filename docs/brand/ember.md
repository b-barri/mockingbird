# Ember — character + voice

The mascot. The warmth in the room while Alex is the voice in the room.

## Who Ember is

Ember is a small, lamp-lit creature who shows up where a PM candidate needs steadiness: first visits, between sessions, when something breaks, after a case finishes. The name names the existing visual phenomenon — the warm-amber radial glow in `.brand-image-glow` is literally what an ember throws.

Ember is **calm, honest, curious**. She doesn't cheer. She doesn't disclaim. She doesn't perform. She notices, and she's there.

If Alex is the interviewer running the loop, Ember is the practice partner who has watched the candidate do this a hundred times. Not impressed, not unimpressed — present.

## The Ember / Alex split

| | Ember | Alex |
| --- | --- | --- |
| Form | Illustrated character, 8 poses | Voice only, no illustration |
| Where | Homepage, onboarding, summary, errors, empty states | Inside the active session |
| Speaks via | Microcopy, tooltips, empty states, encouragement beats | LLM-generated interview lines, framework probes |
| Job | Hold space, signal life, soften friction | Conduct a believable mock interview |

**Hard rule:** Ember never appears during an active session. That's Alex's stage time; any visual presence beyond the voice stage orb steals from the simulation.

## Voice

One-line spec: **plain English, present tense, no exclamation marks, no apologies, no hype**.

Ember would say:

- "Your key isn't validating yet. Try another, or skip voice for now."
- "Three cases on deck. Pick when you're ready."
- "You disconnected. The session's safe — pick up when you're back."
- "First time? You'll need a key from Anthropic. It lives on your laptop, not ours."
- "Nothing in the bank yet. The operator's still loading cases."

Ember would not say:

- "Oops! Looks like something went wrong 🙃" (cheerful, performs)
- "ERROR: Validation failed (E_INVALID_KEY)" (machine voice — that's Alex's terminal world, not Ember's)
- "Don't worry, you've got this!" (cheerleader)
- "Please ensure your API key is properly formatted before proceeding." (corporate, distant)
- "Welcome to Mockingbird! 🎉" (announcer)

The difference: Ember speaks the way the candidate's most-trusted prep partner would speak when nothing is at stake yet. Short sentences. No emoji. No filler. Useful information.

## Things Ember knows about the candidate

This list determines what Ember can plausibly say in any moment:

- Whether this is the candidate's first visit (sessionStorage absent)
- Whether keys are persisted on this device
- Which providers they picked last time
- That they completed (or abandoned) the most recent session
- Approximate cumulative time spent practicing

Ember does **not** know the content of any past session (no transcript memory in V1). She knows the candidate is *here* and *trying*, and that's enough to ground her copy in something real.

## Pose-to-state map

Eight assets exist in `public/branding/`. Mapping each to a context:

| Pose | File | Where it appears | What it signals |
| --- | --- | --- | --- |
| `hero_image.png` | Homepage hero | "This is the product." | Static framing of Ember in her main pose |
| `choose_option.png` | Onboarding · case-select | "Pick what you want to practice." | Active deliberation, looking at options |
| `sitting.png` | Empty state, between sessions | "Waiting, ready when you are." | Calm presence, no urgency |
| `sleeping.png` | First visit before keys, idle states | "Nothing's running. Take your time." | Lower-energy welcome, signals safety |
| `searching.png` | Loading states (validation, case dealing) | "Working on it." | Active processing |
| `analyzed.png` | Post-session summary | "Here's what just happened." | Reflective, post-result |
| `blinking.gif` | Hero or first-visit micro-moment | Subtle life signal | Use sparingly — animated GIF is heavy |
| `post_response.gif` | Summary page reveal animation | Transition into reflection | Use once per session, not on loop |

## Appearance rules

- **Always present:** homepage hero, onboarding case-select (small), summary
- **Conditionally present:** error states (API key invalid, network drop) — use `searching.png` so it doesn't read as Ember's failure
- **Explicitly absent:** during an active interview session (voice stage takes the screen)
- **Sizing:** large on homepage hero (full hero block), medium on summary (~280px), small in onboarding (~120px), tiny in microcopy callouts (32px favicon-ish)
- **Halo:** always render Ember inside `.brand-image-glow` so the lamp light reads as native to the page

## What Ember is not

- Not a chatbot. Ember has fixed copy beats; she does not converse.
- Not a tutorial guide. She does not gate or walk the candidate through anything.
- Not a brand mascot in the corporate sense (no "Ember tips!" panels, no animated callouts pointing at buttons).
- Not anthropomorphized into Alex. They are different entities with different roles.

## Open questions (to resolve later)

- Pronouns: this doc uses "she" as a placeholder. Could be they/them, could be sexless. Worth deciding before any UI copy goes public.
- Origin lore: does Ember have a backstory beyond "lamp-lit bird-creature"? Probably not necessary for V1; defer.
- Sound: does Ember have any sound association (a soft chime when she appears)? V2 question; voice/audio belongs to Alex in V1.
