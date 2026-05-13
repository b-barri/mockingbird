---
title: feat: Tension-Grounded Feedback
type: feat
status: active
date: 2026-05-12
amended: 2026-05-13
origin: docs/brainstorms/2026-05-12-tension-grounded-feedback-requirements.md
---

# feat: Tension-Grounded Feedback

## Amendment (2026-05-13)

Two adds, surfaced during dogfood and visual design review:

1. **U5b — segmented input-mode pill.** The U2-shipped input toggle ("Type instead ↓" link below input) was too easy to miss. After comparing three design variants in `public/design-variants.html`, the chosen design is a segmented pill always visible at the top of the voice stage. See U5b below.

2. **U5c — dimension cards on the summary.** The R5 prose-only output is substantively right but visually flat. Per the 2026-05-13 amendment to the origin requirements doc (R5 updated, Scope Boundaries clarified), the summary now also renders 4 dimension cards above the prose: Customer focus, Structure, and the two case-tension sides for the case in question. Categorical verdict words only (no numeric scores). See U5c below.

## Summary

Replace framework-as-checklist with case-tension as the eval rubric for Mockingbird's post-session feedback. Add a structured `evalRubric` field to each Product Design case, thread it into both the interviewer system prompt (for tension-aware neutral probes) and the coach system prompt (for tension-grounded summary generation), rewrite the coach prompt to produce two-part prose, and update the summary UI to render paragraph breaks. Framework library stays in code but is marked dormant.

---

## Problem Frame

Today's post-session summary explicitly names framework gaps ("CIRCLES — Insight: you skipped..."), which reads as mechanical scoring for any candidate who already knows the frameworks. Mid-session behavior is already mostly correct (the persona prompt enforces probe-not-feedback) — the visible problem is concentrated in the summary prompt and its supporting data. See origin doc for the full motivation.

---

## Requirements

- R1. Case tensions are the evaluation spine (origin R1).
- R2. Framework library is retained as dormant code; no longer drives interviewer behavior or surfaces in output (origin R2, R8).
- R3. Mid-session interviewer stays realistic: neutral clarifications, no steering (origin R3, R4).
- R4. Case evaluation rubric content is captured in a new required `evalRubric` field on CaseTemplate. The existing `brief` field is retained unchanged as the short display tag for the case-select UI (origin R11 — plan refinement; see Key Technical Decisions).
- R5. Post-session summary is two-part prose (worked / missed) with no bullets, no headers, no framework name-drops (origin R5, R8).
- R6. "What was missed" paragraph is prescriptive (origin R6).
- R7. Every observation anchors to a candidate moment or the case's named tension (origin R7).
- R8. Summary stays within 240–280 words across both paragraphs (origin R10).
- R9. Tone remains direct, no sycophancy (origin R9).
- R10. Summary UI renders two paragraphs with visual paragraph break.

**Origin actors:** A1 (Candidate), A2 (Alex interviewer mode), A3 (Alex coach mode)
**Origin flows:** F1 (Realistic interview), F2 (Tension-grounded summary generation)
**Origin acceptance examples:** AE1 (covers R3), AE2 (covers R5, R8), AE3 (covers R6, R7), AE4 (covers R7), AE5 (covers R4)

---

## Scope Boundaries

- Rewriting the 30-case bank — only the new `evalRubric` field is authored; existing `brief`, `prompt`, and `title` fields are untouched. (Plan divergence from origin R11, which framed this as "brief enrichment" — see Key Technical Decisions for rationale.)
- Adding numeric scores, scorecards, or per-dimension ratings.
- Surfacing the framework library to candidates as an opt-in reference.
- Cross-session progress tracking.
- Adapting feedback tone by candidate experience level.
- Changing the interviewer persona name, voice provider toggle, or session UI beyond the summary paragraph render.
- Adding new case types (Strategy, Metrics, Growth) — Product Design only.
- Deleting framework-library.ts or its tests — file stays in code, marked dormant.

---

## Context & Research

### Relevant Code and Patterns

- `lib/llm/summary.ts` — current `COACH_SYSTEM_PROMPT` and `assembleSummaryUserMessage`. Source of the "Framework gaps" language that needs to go.
- `lib/llm/prompts/case-templates/product-design.ts` — 30-case bank with `CaseTemplate` interface. New `evalRubric` field gets added here.
- `lib/llm/prompts/persona-google-meta-pm.ts` — interviewer system prompt (Alex persona). Already enforces probe-not-feedback (`:24-27`); `renderPersonaWithCase` is the injection point for case tensions.
- `lib/llm/interviewer.ts` — assembles the interviewer system prompt; threads framework library into the persona via `renderPersonaWithCase`.
- `lib/llm/prompts/framework-library.ts` — public framework definitions. Becomes dormant reference code.
- `lib/llm/__tests__/summary.test.ts` — asserts literal `Framework gaps` string at `:28`. Will break under the new prompt and must be replaced.
- `lib/llm/__tests__/framework-probes.test.ts` — exercises the framework library structurally; can remain green even with library dormant.
- `components/summary/summary-card.tsx:186` — renders `summaryText` in a single `<p>` element; needs adjustment to render double-newline-separated paragraphs as separate `<p>` tags.
- `app/(session)/summary/[id]/page.tsx` — drives summary generation; consumes `summaryText` as a string.

### Institutional Learnings

- `docs/solutions/` does not exist in this repo — no prior institutional learnings to pull from for this scope.

### External References

- Skipped. Local patterns are well-established (prompt engineering done in-repo; vitest patterns clear from existing tests); domain is internal product behavior, not high-risk integration.

---

## Key Technical Decisions

- **New `evalRubric` field on CaseTemplate instead of expanding `brief` in place.** The origin doc said "brief must be expressive"; the plan refines this as a separate field. Rationale: `brief` already serves as the short display tag on the case-select page; making it long would force a UI rework or truncate-on-display logic. Adding `evalRubric` cleanly separates the display concern (short, scannable) from the LLM eval concern (richer, tension-articulated). Cost: small schema change in one file.
- **Prompt-level constraint as the no-checklist guardrail, no post-generation linter.** The origin doc deferred this to planning. Decision: explicit negative examples in the system prompt ("don't say 'good structure'", "don't use checklist language", "every observation must anchor to ___") are sufficient for V1. A regex linter on LLM output is over-engineering at this scope and can be a follow-up if real drift surfaces in dogfooding.
- **`evalRubric` is injected into the COACH (summary) prompt only — NOT the interviewer prompt.** Earlier draft argued for interviewer-side injection so probes would be case-shaped instead of framework-shaped. Cross-reviewer feedback flagged this as the path AE1 silently fails: giving Alex the rubric (which explicitly names "common miss" and "strong engagement" behaviors) is asking the LLM to hold the answer key with a "don't tell them" instruction, and LLMs leak under that contradiction. Keeping mid-session purely persona-driven preserves R3 cleanly. The "case-shaped probes" benefit is achieved instead by removing framework-library injection from the persona prompt (see next decision) — Alex falls back to natural interviewer curiosity, which already matches the case context via the case prompt itself.
- **Framework library is genuinely decoupled from the live interviewer prompt, not just annotated.** Origin R2 says the framework library "does not drive interviewer probes." A comment alone leaves `assembleSystemPrompt` calling `renderFrameworkLibrary` every session and injecting verbatim CIRCLES/AARM probes into Alex's prompt — which contradicts R2 in code while passing in docs. U4 actually removes the framework-library injection from `assembleSystemPrompt` and rewords the persona prompt's "Framework awareness" section to drop framework-step language while preserving the probe-not-feedback rule. The framework library file (and its data) stays in code as silent reference — possibly useful for future case types — but is no longer wired into runtime prompts.
- **Summary card renders by splitting on `\n\n`**, mapping each chunk to its own `<p>`. Simpler than `white-space: pre-line` and gives explicit DOM-level paragraph semantics (better for a11y / copy behavior).

---

## Open Questions

### Resolved During Planning

- *brief vs evalRubric (origin Deferred):* Resolved as new field per Key Technical Decisions above.
- *No-checklist enforcement mechanism (origin Deferred):* Resolved as prompt-level negative examples; no separate linter.
- *Framework library dormancy marker (origin Deferred):* Resolved as inline file-header comment + a top-of-file ASCII deprecation banner; no file move, no symbol rename.

### Deferred to Implementation

- *Exact wording of the new coach system prompt:* The prompt's tone and structure are specified; the specific sentence-level phrasing is best authored at implementation time when the test assertions and dogfooding sessions can validate it together.
- *Whether `evalRubric` content should mirror the existing `brief` for the 5 cases whose briefs already explicitly name tensions (e.g., `swiggy-delivery-partners`):* Implementation decides per-case whether to copy-and-extend or rewrite from scratch.

---

## Implementation Units

- U1. **Add `evalRubric` field to CaseTemplate and populate for all 30 cases**

**Goal:** Establish the structured eval rubric data that downstream prompts will consume. Each case names the tension(s) and conveys what strong vs weak engagement on each side looks like.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Modify: `lib/llm/prompts/case-templates/product-design.ts`
- Create: `lib/llm/prompts/case-templates/__tests__/product-design.test.ts`

**Approach:**
- Extend `CaseTemplate` interface with `readonly evalRubric: string` (required field).
- For each of the 30 cases, author 3–5 sentences covering:
  1. The named tension(s) — what trade-off is the case testing?
  2. What "strong engagement" looks like (concrete behaviors on each side).
  3. The most common miss (the side candidates tend to skip).
- Keep `brief` unchanged as the short display tag for the case-select UI.
- No framework names anywhere in `evalRubric` content.

**Patterns to follow:**
- Existing case template structure in the same file (data-only, alphabetized by no particular order, kebab-case IDs).

**Test scenarios:**
- Happy path: every case in `PRODUCT_DESIGN_CASES` has a non-empty `evalRubric` string ≥ 200 characters (richness floor — current briefs are 70–115 chars, so the floor genuinely forces enrichment beyond a copy-paste of the brief).
- Happy path: every case's `evalRubric` is materially distinct from its `brief` — assert `evalRubric.length > brief.length * 2` (rules out trivial copy-paste-with-padding regressions).
- Happy path: every case's `evalRubric` names two or more tension sides — assert the string contains at least two of the markers `"strong"`, `"weak"`, `"miss"`, `"trade-off"`, `" vs "`, `" versus "` (heuristic that the rubric articulates engagement levels, not just a tension name).
- Edge case: no `evalRubric` contains a framework name or step-number language — assert via `/\b(CIRCLES|AARM|Goals-Signals-Metrics)\b/i` AND via `/\bstep\s+\d+\b/i` (catches both literal acronyms and paraphrased "step N" structure).
- Edge case: `pickRandomCase()` returns a case with `evalRubric` populated (smoke test the field is part of the returned shape).

**Verification:**
- 30 entries each have `evalRubric` content authored.
- TypeScript compilation passes with the new required field.
- New test file passes.

---

- U2. **Thread case `evalRubric` into the summary user message**

**Goal:** Wire the eval rubric data through to the coach (summary) prompt so U3's prompt rewrite has the rubric as grounded context. Interviewer prompt is NOT modified here — see Key Technical Decisions for why.

**Requirements:** R1, R7

**Dependencies:** U1

**Files:**
- Modify: `lib/llm/summary.ts` (assembleSummaryUserMessage)
- Modify: `lib/llm/__tests__/summary.test.ts`

**Approach:**
- In `assembleSummaryUserMessage`, add a "Tensions this case is testing" section between the case title and the transcript, populated with `caseTemplate.evalRubric`.
- Update the existing test asserting user-message shape to also assert the rubric appears, clearly labeled, and exactly once.
- The interviewer system prompt is intentionally NOT extended with the rubric — this is decided in Key Technical Decisions. U4 handles the corresponding interviewer-prompt cleanup.

**Patterns to follow:**
- Existing `assembleSummaryUserMessage` body structure — sectioned with labeled headers (`Case:`, `Transcript:`).

**Test scenarios:**
- Happy path: user message includes the eval rubric text for the case in question, under a clearly-labeled section header.
- Happy path: user message preserves existing case title, transcript, and speaker-prefix formatting (regression guard).
- Edge case: rubric is rendered exactly once even if the assembler is called repeatedly with the same case.
- Edge case: stricken/partial turns continue to be excluded from the transcript (existing R11 behavior preserved).

**Verification:**
- Summary user-message tests pass.
- No interviewer or persona file is modified in this unit.

---

- U3. **Rewrite coach system prompt for tension-grounded two-part prose, and render paragraph breaks in the summary UI**

**Goal:** The visible product change. Replace `COACH_SYSTEM_PROMPT` with the new shape, update tests to enforce it, bump the API max_tokens to accommodate the new word budget, and adjust the summary card to render two paragraphs.

**Requirements:** R5, R6, R7, R8, R9, R10

**Dependencies:** U1, U2

**Files:**
- Modify: `lib/llm/summary.ts` (COACH_SYSTEM_PROMPT)
- Modify: `lib/llm/__tests__/summary.test.ts` — replace ALL FOUR stale assertions: (a) the `/no more than 180 words/i` assertion conflicts with the new 240–280 budget, (b)–(d) the three section-name assertions (`Structure`, `Strongest moment`, `Framework gaps`) all reference the old prompt structure and must be replaced with new-shape assertions (see Test scenarios below).
- Modify: `app/api/summary/route.ts` — bump `max_tokens` from 512 to ~700 to give comfortable headroom over the new 240–280 word budget (280 words ≈ 373 tokens; 512 is tight, 700 gives safe margin).
- Modify: `components/summary/summary-card.tsx` (paragraph rendering)
- Modify: `components/summary/__tests__/summary-card.test.tsx` if it exists; otherwise add a focused test for paragraph splitting.

**Approach:**
- Rewrite `COACH_SYSTEM_PROMPT` with the following structure:
  - Frame the LLM as Alex transitioning from interviewer to coach.
  - Reference the case's named tensions explicitly (the rubric is in the user message — the system prompt instructs the LLM to use it as the evaluation spine).
  - Demand two paragraphs separated by a single blank line:
    1. "What worked" — strengths anchored to specific candidate moments and which tension side they engaged.
    2. "What was missed and could have been better" — prescriptive: name the missed tension side, what a stronger PM would have done, anchored to a candidate moment where the miss occurred.
  - Negative examples block — explicitly forbid:
    - Framework names (`CIRCLES`, `AARM`, `Goals-Signals-Metrics`, "framework step", "step N of X").
    - Generic praise/criticism without an anchor ("good structure," "you organized your answer well," "be more specific").
    - Sycophancy ("great job overall," "you have lots of potential").
    - Headers, bullets, bold, or any non-prose formatting within either paragraph.
  - Tone: direct, honest, senior-PM voice.
  - Word budget: 240–280 words total across both paragraphs.
- In `summary-card.tsx`, change the single `<p>` render to split `summaryText` on `\n\n` and map each chunk to its own `<p className="text-[16px] leading-[1.7] text-ink">`. Maintain existing wrapper styles and `data-testid`.

**Patterns to follow:**
- Existing prompt-engineering style in `persona-google-meta-pm.ts` — clear sections, BAD/GOOD examples, "things that should NEVER appear" enumeration.

**Test scenarios:**
- Happy path: `summarySystemPrompt()` returns a string that mentions "what worked" and "what was missed" (or close equivalents — match case-insensitive substrings).
- Happy path: prompt instructs the LLM to ground feedback in the case's named tensions.
- Happy path: prompt explicitly enforces the two-paragraph shape ("two paragraphs", "single blank line", or equivalent).
- Happy path: prompt requires prescriptive language in the "what was missed" section.
- Happy path: prompt retains direct/no-sycophancy tone constraint.
- Edge case (R8 / AE2): prompt does NOT contain the literal substring `Framework gaps`, `CIRCLES`, `AARM`, or `Goals-Signals-Metrics`.
- Edge case (R7 / AE3, AE4): prompt requires every observation to anchor to either a candidate moment or a named tension.
- Edge case: word-budget constraint is present in the prompt (240–280 or equivalent).
- Integration (summary card): given `summaryText = "Para one.\n\nPara two."`, the rendered card produces two `<p>` elements with the corresponding text content.
- Covers AE2. Given the candidate has just finished a case, when the summary renders, then no framework name or acronym appears in the output.
- Covers AE3. Given a transcript where the candidate skipped one side of a known tension, when the summary is composed, then the "what was missed" paragraph names the substance of that tension and offers a prescription.

**Verification:**
- All summary unit tests pass.
- Summary card renders double-newline-separated text as separate paragraphs.
- Manual dogfood: a real session through the new prompt produces two paragraphs with no framework names and at least one quoted/paraphrased candidate moment.

---

- U4. **Genuinely decouple framework library from the live interviewer prompt**

**Goal:** Make R2 ("framework library does not drive interviewer probes") true in code, not just in docs. Remove the framework-library injection from `assembleSystemPrompt`, rewrite the persona prompt's "Framework awareness" section to drop framework-step language while preserving the probe-not-feedback rule, and mark the framework library file as silent-reference data.

**Requirements:** R2, R3

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `lib/llm/interviewer.ts` (`assembleSystemPrompt` — drop the `renderFrameworkLibrary` call and the corresponding parameter)
- Modify: `lib/llm/prompts/persona-google-meta-pm.ts` (`renderPersonaWithCase` — remove the `frameworkLibrarySection` parameter and the `# Framework library you're aware of` block from the rendered output; rewrite the persona prompt's "Framework awareness" section to talk about *case-aware probing* — natural interviewer curiosity grounded in the case prompt itself — without naming frameworks or framework steps)
- Modify: `lib/llm/prompts/framework-library.ts` (top-of-file ASCII banner noting dormancy; no structural changes to the data or exported functions)
- Modify: `lib/llm/__tests__/interviewer.test.ts` (drop any assertion that the system prompt contains framework names or `Probe if skipped:` rendered strings; keep / strengthen assertions on the probe-not-feedback rule and persona-break detection)
- Modify: `lib/llm/__tests__/framework-probes.test.ts` only if any test depends on the library being injected into the live prompt; the structural tests of the library data itself stay green and unchanged.

**Approach:**
- In `assembleSystemPrompt`, stop calling `renderFrameworkLibrary` and stop passing the framework section into `renderPersonaWithCase`. Adjust the function's input type accordingly (no more `frameworks` parameter).
- In `renderPersonaWithCase`, drop the `frameworkLibrarySection` parameter and the corresponding template block. Output ends after the case statement and the begin-the-session instruction.
- In `persona-google-meta-pm.ts`, edit the `Framework awareness` section of `GOOGLE_META_PM_PERSONA` to remove the explicit framework-library reference and the framework-step probe instruction. Replace with case-aware probing language: "When the candidate skips a step a real interviewer would naturally clarify (e.g., launching into solutions without naming the user), your next turn is a clarifying QUESTION grounded in what they just said — not a feedback statement." Preserve the BAD/GOOD example pair, the persona-break triggers, the pacing rules, and the opening-turn rules.
- In `framework-library.ts`, prepend an ASCII banner comment noting: "Dormant as of 2026-05-12: this library is no longer injected into the interviewer system prompt. Retained as silent reference for the LLM's general knowledge and as scaffolding for potential future case types (Strategy, Growth, Metrics)." Reference this plan path. Do not change exported types, data, or functions.
- The framework probe definitions (`probe:` strings inside each FrameworkStep) become unused. Leave them in place — they continue to serve as a reference of what "good probe shape" looks like for future authoring.

**Patterns to follow:**
- Existing file-header comment style in `framework-library.ts:1-7`.
- Existing system-prompt rendering style in `persona-google-meta-pm.ts:59-76`.

**Test scenarios:**
- Happy path: `assembleSystemPrompt` is called with a case template and produces a system prompt that does NOT contain any of: `CIRCLES`, `AARM`, `Goals-Signals-Metrics`, `Probe if skipped:`, `Framework library`, `framework probe`, `# Framework library you're aware of`.
- Happy path: the assembled system prompt still contains the persona-break detection guidance, the "Probe, don't feedback" BAD/GOOD example pair, and the opening-turn rules (regression guards on what must NOT change).
- Happy path: `renderPersonaWithCase` continues to inject the case title and case body verbatim.
- Edge case: `framework-probes.test.ts` continues to pass — the library is dormant in runtime use but its data shape is unchanged.
- Edge case: TypeScript compilation remains green after the `frameworks` parameter is removed from `assembleSystemPrompt` and `frameworkLibrarySection` is removed from `renderPersonaWithCase`. Callers update mechanically.

**Verification:**
- Grep the assembled interviewer system prompt for `CIRCLES` — must not match.
- All existing tests pass (with the targeted assertion removals/replacements in `interviewer.test.ts`).
- File-header banner on `framework-library.ts` visible.

---

## System-Wide Impact

- **Interaction graph:** Summary prompt assembly is the central change — touches `lib/llm/summary.ts` (server-side prompt), `lib/llm/interviewer.ts` (mid-session prompt), and `components/summary/summary-card.tsx` (render). No new entry points or callbacks introduced.
- **Error propagation:** Unchanged. The LLM-failure path in the existing summary route stays as-is.
- **State lifecycle risks:** None. The change is pure prompt + render; no persistent state alteration.
- **API surface parity:** The `/api/summary` route accepts the same transcript shape; only the system prompt content changes.
- **Integration coverage:** A live LLM call producing well-formed two-paragraph output is a behavior the unit tests cannot prove (they assert prompt content, not LLM compliance). Manual dogfood is the validation step — note explicit dogfooding in the verification of U3.
- **Unchanged invariants:** The framework library file is preserved as-is. `framework-probes.test.ts` assertions are not modified. The case-select UI behavior is unchanged (still reads `brief`).

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| LLM ignores the negative examples and still drifts to generic praise. | Prompt is structured with explicit forbidden phrases AND positive anchoring rules. If dogfooding shows drift across 3+ sessions, ship the post-generation regex linter as a follow-up (genuinely cheap — ~10-line filter on the streamed response). |
| Authoring 30 `evalRubric` entries inconsistently (some thin, some over-detailed). | Strengthened test heuristics (≥200 chars, length > brief×2, multiple engagement-level markers, framework-paraphrase regex) catch the most common laziness modes. Manual review pass across all 30 before merge for substantive quality. |
| Summary card paragraph-split breaks on LLM output that uses single newlines or no separators. | Split logic falls back to one paragraph if no `\n\n` present. New test covers the single-paragraph case. Streaming may briefly show one paragraph mid-stream before the second `\n` arrives — accepted as cosmetic, not a correctness issue. |
| `evalRubric` field added as required breaks any other place CaseTemplate is constructed (e.g., test fixtures). | (1) Type system surfaces this at compile time. (2) U1 implementation includes `git grep -n "CaseTemplate"` and `grep -rn 'type: "product-design"' lib/` scans to enumerate fixture sites before merge. (3) Tests reading from `PRODUCT_DESIGN_CASES` pick up the new field automatically — no fixture work needed there. |
| Removing framework injection from the interviewer prompt weakens Alex's mid-session probe behavior. | U4 preserves the persona prompt's "Probe, don't feedback" rule (BAD/GOOD example pair) and rewrites the framework-step language to case-aware natural curiosity. Existing interviewer tests guard the persona-break detection. Manual dogfood of 2-3 sessions post-U4 to confirm Alex still probes meaningfully without framework scaffolding. |

---

## Documentation / Operational Notes

- No external docs to update — this is an internal product change.
- Update the brainstorm doc's status if the team tracks it; otherwise leave the requirements doc as-authored (it's the origin record).
- After landing, a manual dogfood pass on 3–5 cases of varying shape (one Indian-context like UPI, one Western like Calendar, one accessibility like Maps, one social like Instagram) is the meaningful validation. Compare pre/post transcripts of the same case to verify feedback quality is materially different.
- **Dogfood failure threshold**: if ≥1 of 3 V1 sessions produces (a) a framework-paraphrase leak ("step 1: identify user..."), (b) sycophantic opener ("great session overall"), or (c) generic praise without a candidate-moment anchor ("you organized your answer well"), ship the post-generation regex linter as a follow-up PR before broader use.

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-05-12-tension-grounded-feedback-requirements.md`
- Related code: `lib/llm/summary.ts`, `lib/llm/prompts/persona-google-meta-pm.ts`, `lib/llm/prompts/case-templates/product-design.ts`, `components/summary/summary-card.tsx`
- Related prior plan: `docs/plans/2026-05-11-001-feat-pm-interview-voice-agent-plan.md` (parent voice-agent plan establishing R16 summary requirement)
