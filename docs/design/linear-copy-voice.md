# Copy voice — the app microcopy pass

The homepage copy is now locked. Carry that same voice into the rest of the app.
This is a **copy refinement** pass: sharpen user-facing strings for clarity and
confidence. Keep all functional meaning. Do NOT change layout, classes, logic, or
behavior — only the words in user-facing strings.

## The voice (from the locked homepage)
- **Lead with what it is / what to do.** Plain before clever. A first-timer should
  never have to decode a clever line. (We replaced "The mock panel that pushes
  back" with "An AI mock interviewer for PMs that pushes back" for exactly this.)
- **Sentence case.** Confident, concrete, short. No hype verbs (streamline,
  supercharge, unlock, leverage, seamless, empower, delight). No exclamation spam.
- **No em-dashes (—).** Use a period or comma.
- **Name the category, not a character, until the character is introduced.**
  - The AI interviewer is named **Alex**. You only "meet" Alex in the live
    session. So in **onboarding, screen prep, and summary**, refer to "the
    interviewer" or "your AI interviewer" — NOT "Alex" (the visitor hasn't met it).
  - In the **live session UI** (and after), "Alex" is fine and good — that's where
    you meet it.
  - The mascot **Ember** is separate (warmth, not the interviewer). Don't conflate.
- **Keep every functional fact**: BYO-key handling, keys-stay-in-browser privacy,
  costs/spend, step counts, timing, scores, dimensions. Sharpen the wording around
  them, never drop the substance.

## Reference: homepage lines already shipped
- Hero: "An AI mock interviewer for PMs that pushes back." / "Practice real Product
  Design cases out loud. The interviewer probes the soft spot in your answer
  instead of nodding along, then scores you the second you hang up. Bring your own
  API key. No account, no paywall."
- Section headers are plain: "How a session runs", "Set up in 30 seconds.",
  "One case, spoken.", "Receipts, not vibes.", "Your keys. Your spend. No account."

## What to touch in each file
Headlines, section labels (the `ascii-rule` text), helper/description text, button
labels, status messages, empty states, error messages, placeholders, toasts.
Make each one clearer and more confident. Trim filler. If a string is already
crisp and on-voice, leave it.

## When done
- Run `npx tsc --noEmit` and `npx vitest run <your component dirs>`; fix anything
  you broke.
- If you changed a copy string asserted in a test (`__tests__`, `test/`, `tests/`),
  update the test to match the new copy.
- Stay strictly within your assigned file list.
