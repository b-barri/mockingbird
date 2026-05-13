---
date: 2026-05-12
topic: tension-grounded-feedback
amended: 2026-05-13
---

# Tension-Grounded Feedback

## Amendment (2026-05-13)

After visual design review of three feedback-shape variants, the chosen direction is **"dimension cards + tension prose"** — a soft reversal of the original Scope Boundaries exclusion of "scorecards, or per-dimension ratings." The reversal is deliberate and bounded:

- **Added to scope.** Per-dimension verdict cards (4 dimensions per session: Customer focus, Structure, plus two case-tension sides derived from the case's `evalRubric`). Each dimension carries a verdict word (`strong` / `developing` / `missing`) and a one-line observation anchored to a candidate moment. The two-paragraph prose (R5) is preserved underneath the cards, not replaced.
- **Still excluded.** Numeric scores (1-5 stars, 7/10, etc.), composite overall scores, percentile rankings. Verdict words are categorical, not ordinal — `developing` is not "2 out of 3," it is its own classification. This preserves the brainstorm's substantive concern that candidates will optimize for the number rather than the substance.
- **Rationale for the reversal.** Visual design review surfaced that prose-only feedback, while substantively right, lacked scannability — a candidate scanning the summary card cannot quickly identify *which* dimensions were strong and which weren't without reading both paragraphs. Cards make the structure pre-attentive without making it numeric.

R5 below is updated to reflect this. Implementation work is captured in plan U5c (see `docs/plans/2026-05-12-001-feat-tension-grounded-feedback-plan.md`).

---

## Summary

Mockingbird's post-session feedback pivots from framework-checklist evaluation to case-tension-grounded coaching. Each case's named tensions become the evaluation rubric in place of the framework library, Alex stays a realistic interviewer mid-session, and the summary becomes a two-part prose review — what worked, what was missed — with no framework name-drops surfaced to the candidate.

---

## Problem Frame

The current post-session summary explicitly names framework gaps to the candidate ("CIRCLES — Insight: you skipped..."). For PM candidates who already know the frameworks, this reads as mechanical scoring — checkmark grading rather than substantive feedback on what they actually said. The framework library functions less like coaching scaffolding and more like a checklist the LLM grades against, and that texture surfaces in the summary's voice. Mockingbird's value proposition depends on feedback that feels like a senior PM listened to *this* answer and has something specific to say. The current shape undermines that.

A second cost: the framework spine also constrains how cases differ from each other. Two cases with very different framing tensions (Instagram-for-teens vs Swiggy-delivery-partners) get evaluated against the same CIRCLES steps, washing out what makes each case worth practicing.

---

## Actors

- A1. **Candidate** — PM interview practice user. Hears Alex during the session and reads the summary after.
- A2. **Alex (interviewer mode)** — neutral interviewer during the session. Asks clarifying / follow-up questions; does not steer the candidate toward tensions.
- A3. **Alex (coach mode)** — same persona, post-session. Reads the transcript and the case's named tensions to compose the two-part feedback.

---

## Key Flows

- F1. **Realistic interview session**
  - **Trigger:** Candidate starts a session from the case-select page.
  - **Actors:** A1, A2
  - **Steps:** Alex reads the case prompt verbatim → candidate responds → Alex asks neutral clarifying / follow-up questions when a real interviewer would naturally do so → candidate works through the case → session ends (timer or candidate-initiated).
  - **Outcome:** Transcript captured. Tensions may have been engaged or skipped, but Alex never explicitly steered the candidate toward a tension.
  - **Covered by:** R3, R4

- F2. **Tension-grounded summary generation**
  - **Trigger:** Session ends.
  - **Actors:** A3, A1 (as reader of the output)
  - **Steps:** Coach reads the transcript and the case's named tensions → identifies how the candidate engaged each side of those tensions → composes "what worked" paragraph anchored to specific candidate moments → composes "what was missed and could have been better" paragraph with prescriptive coaching → renders to the summary page.
  - **Outcome:** Candidate reads two-part prose feedback grounded in the case's tensions and their own words. No framework name appears in the output.
  - **Covered by:** R1, R5, R6, R7, R8, R9, R10

---

## Requirements

**Evaluation spine**
- R1. Each Product Design case's named tensions (the content of the case's `brief`) are the load-bearing evaluation criteria for that session's feedback. The LLM evaluates how well the candidate engaged each side of the tension.
- R2. The framework library is retained as silent internal reference for the LLM but does not drive interviewer probes and does not surface in candidate-facing output.
- R11. Each Product Design case's `brief` must be expressive enough to serve as the eval rubric — it names the tension and conveys what strong vs weak engagement on each side looks like. Current one-liner briefs may need light enrichment; that enrichment is in scope for this work.

**Mid-session interviewer behavior**
- R3. Alex stays a realistic interviewer mid-session: neutral clarifications and follow-ups only. Alex does not steer the candidate toward under-engaged tensions during the session.
- R4. When the candidate skips a step a real interviewer would naturally ask about (e.g., launching into solutions without naming the user), Alex may ask a clarifying question — but the question is framed as interviewer curiosity, not as a framework-checklist probe.

**Post-session summary shape**
- R5. (Updated 2026-05-13) The summary has two parts rendered in this order: (a) a dimension-cards block showing 4 dimensions for the session — Customer focus, Structure, plus two case-tension sides derived from the case's `evalRubric` — each with a verdict word (`strong` / `developing` / `missing`) and a one-line observation anchored to a candidate moment; (b) a two-part prose narrative — a "what worked" paragraph followed by a "what was missed and could have been better" paragraph. No numeric scores. No bullets, headers, or bold within either paragraph.
- R6. The "what was missed" paragraph is *prescriptive* — it names what a stronger PM would have done differently for the missed side of the tension, not just what got skipped.
- R7. Every observation in either paragraph anchors to one of: (a) a specific candidate moment, paraphrased or quoted from the transcript, or (b) the case's named tension expressed in plain language (the substance of the tension, not its framework name). Generic praise or criticism without an anchor is disallowed.
- R10. The summary stays within roughly 240–280 words total across both paragraphs.

**Surface discipline**
- R8. The candidate-facing summary never names a framework by name (no "CIRCLES", "AARM", "Goals-Signals-Metrics", or analogous acronym) and never references "framework steps", "step N of X", or equivalent checklist structure.
- R9. The summary tone remains direct and honest: no sycophancy, no "great job overall," no "you have lots of potential" hedging.

---

## Acceptance Examples

- AE1. **Covers R3.** Given a candidate working through "Instagram for teen wellbeing" engages the engagement-side tension robustly but never mentions the harm side, when Alex is mid-session, then Alex does not say "What about the harm side?" or any equivalent prompt that steers toward the missing tension. Alex may still ask clarifications about the engagement work the candidate is already doing.
- AE2. **Covers R5, R8.** Given the candidate has just finished a case, when the summary renders, then the candidate sees two prose paragraphs (worked / missed) with no framework name appearing anywhere, no acronym (CIRCLES, AARM, etc.), and no "step N of X" structure.
- AE3. **Covers R6, R7.** Given the candidate skipped the harm side of "Instagram for teen wellbeing," when the "what was missed" paragraph is composed, then it names the substance of the harm tension in plain language, offers a prescription such as "a stronger answer would have led with 'who could this hurt and how' before optimizing engagement levers," and anchors that prescription to a specific candidate moment where they pivoted to features without acknowledging harm.
- AE4. **Covers R7.** Given a transcript with no candidate moments that strongly engaged the tensions, when the summary is composed, then observations are anchored to the named tension substance even without a candidate quote — but never to generic PM-craft platitudes like "you organized your answer well."
- AE5. **Covers R4.** Given a candidate launches directly into solutions without identifying the user, when a real interviewer would naturally ask "who are we designing for?", then Alex asks that question — but framed as natural interviewer curiosity, never as "you skipped the Customer step" or similar checklist language.

---

## Success Criteria

- A candidate who knows their PM frameworks well reads the summary and does not recognize it as framework-scored grading — they recognize it as a senior PM responding to their specific session.
- Re-running an old transcript through the new logic produces tension-grounded feedback that names specific moments from the candidate's words, not generic structure praise.
- A downstream implementer (ce-plan, then executor) can write the new summary prompt, update the failing tests, and know what AE-level behaviors must hold without re-deriving product intent from scratch.

---

## Scope Boundaries

- Rewriting the 30-case bank — only `brief` field enrichment is in scope.
- Adding numeric scores, composite ratings, or per-dimension ordinal ratings — re-introduces checklist-feel. *Note: categorical verdict words (`strong` / `developing` / `missing`) ARE in scope per the 2026-05-13 amendment at the top of this doc.*
- Surfacing the framework library to candidates as an opt-in reference ("Would you like me to use CIRCLES?").
- Cross-session progress tracking ("you've improved on X across 3 sessions").
- Adapting feedback tone by candidate experience level (junior vs senior PM).
- Changing the interviewer persona name, voice provider toggle, or session UI.
- Adding new case types (Strategy, Metrics, Growth) — Product Design only stays V1.
- Re-architecting or deleting the framework library code — it stays in place, dormant.

---

## Key Decisions

- **Case-specific tensions over universal PM craft dimensions as eval spine.** Feedback that names the specific tension a case is testing is more concrete and harder for the LLM to fake than universal dimensions. Trade-off accepted: brief richness becomes load-bearing per case.
- **Realistic interviewer over active coach mid-session.** Fidelity-first practice. Trade-off accepted: less learning per session for candidates who would benefit from mid-session steering; mitigated by sharper post-session feedback.
- **Two-part prose over moment-anchored coaching format.** Maps directly to user's stated preference ("what was done well + what was missed"). Trade-off accepted: less senior-PM-coaching texture than a fully moment-anchored format would have produced.
- **Framework library retained but dormant rather than deleted.** Minimizes blast radius and preserves optionality for future case types that might need the structure. Trade-off accepted: some code lives without active use until pruned in a later pass.
- **Prescriptive "what would have been better" rather than just diagnostic.** Per the user's "could have been better" framing, the gaps paragraph offers the alternative move, not just an inventory of absences.

---

## Dependencies / Assumptions

- Assumes the existing case `brief` content is enrichable in-place; if a particular case's tension is genuinely thin or wrong, brief authoring takes precedence over prompt work for that case.
- Assumes the LLM (Claude in the current setup) can reliably distinguish "engaged tension side A vs side B" given a clearly-articulated brief. If it cannot, the eval spine quality degrades toward generic and a separate validation pass may be needed.
- The existing summary test asserts a literal `Framework gaps` string in the prompt — that assertion will break under this change and must be replaced with new assertions covering the two-part shape and the anchoring rule.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R11][User decision during planning] Should `brief` enrichment happen as a separate pre-work pass across all 30 cases (uniform quality bar before any prompt changes land), or case-by-case as real sessions surface thin briefs? Planning can pick based on how thin the current briefs read against the new eval criteria.
- [Affects R7][Technical] What enforcement mechanism prevents the LLM from drifting to generic praise — a prompt-level constraint, a post-generation linter, or a separate validation pass? Planning to pick.
- [Affects R2][Needs research] What's the cleanest way to mark `framework-library.ts` as dormant without misleading future readers — an inline comment, a deprecation marker, or moving its content into a references/ folder? Planning to pick.
