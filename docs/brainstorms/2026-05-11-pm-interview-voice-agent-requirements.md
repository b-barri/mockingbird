---
date: 2026-05-11
topic: pm-interview-voice-agent
review_round: 1
---

# PM Interview Voice Agent

## Summary

A voice-first PM interview simulator (Product Design cases) with framework-aware probes from a hardcoded library, a constrained editorial homepage, and a provider-pluggable voice layer. A V0 three-way bakeoff across Cartesia, Sarvam, and ElevenLabs seeds both the V1 voice-provider choice and the portfolio artifact for the operator's Sarvam, ElevenLabs, and Wispr Flow PM applications. V1 ships free with BYO API keys behind the bakeoff winner; V2 introduces a managed-keys paywall after a single free trial.

---

## Problem Frame

The operator (Bhavya, @bhavya_barri) is actively prepping for PM roles at voice-AI companies (Sarvam, ElevenLabs, Wispr Flow) and adjacent product roles. The personal prep loop has a visible bottleneck: the human mock. Consuming Exponent + videos works fine. Building and iterating personal frameworks works fine. What sucks is practice-and-feedback — friends aren't always available, may not be PMs, give shallow feedback, and never remember the candidate's evolving frameworks across sessions.

Existing tools fall into three buckets, each with a clear gap: generic AI prep tools (Exponent, IGotAnOffer) use generic frameworks and don't know the candidate's; real-time interview overlays (Final Round AI) target live recruiter interviews, not practice; general-purpose voice agents (ChatGPT voice mode) lack the simulation discipline of staying in character as an interviewer.

The artifact also serves a second audience the operator did not have when prep started: PM hiring loops at voice-AI companies. A working product that empirically compares voice providers is a higher-signal artifact than a deck for these particular employers, who hire builders.

---

## Actors

- A1. **Anonymous prep candidate** — visits the public site, brings own API key, runs a session without account or payment in V1. Default user the product is designed around.
- A2. **Operator** — uses the tool weekly for own prep, maintains a private framework library, ships voice-provider comparison content on X. Both the maintainer and the most demanding user.
- A3. **Voice provider** — Cartesia, Sarvam, and ElevenLabs (all V0 bakeoff candidates). One becomes V1 default; the other two ship as switchable options in V1.1. Each provides TTS, ASR, and/or end-to-end voice-agent capabilities. Accessed via a provider-abstraction layer.
- A4. **Interviewer LLM** — the language model playing the Google/Meta PM persona; receives the framework library + case prompt + ongoing transcript as context; produces both spoken turns and the post-session summary.

---

## Key Flows

- F1. **First visit and session start (anonymous candidate)**
  - **Trigger:** Visitor lands on the homepage.
  - **Actors:** A1, A3, A4.
  - **Steps:** (1) Visitor sees hero + feature blocks + optional embedded video of the operator running a real case. (2) Visitor clicks "Start a session" CTA. (3) Onboarding key-entry screen with one field per required provider, inline format validation, and a synchronous test call per provider before advancing (gates R6a). (4) Case-selection screen listing available Product Design cases from the hardcoded library with a count ("N cases available") and a "Surprise me" option that picks randomly; empty state if library has zero cases shows "No cases configured — operator must add cases before sessions can run." (5) Brief pre-session confirmation ("Ready? The interviewer will greet you in character."). (6) Case starts — the AI greets, briefly frames the case, asks the first question. The candidate can go back from case-selection to key entry but not from the in-session screen.
  - **Outcome:** Session begins inside the three-panel session screen with voice already listening.
  - **Covered by:** R1, R2, R3, R5, R6, R6a, R12.

- F2. **In-session interview (anonymous candidate, or operator with private frameworks)**
  - **Trigger:** Session is active.
  - **Actors:** A1 (anonymous candidate) or A2 (operator); A3, A4.
  - **Steps:** (1) Voice status is always visible — orb + status text indicate listening / thinking / speaking, and surface explicit error states for mic-denied / network-drop / ASR-null / invalid-key / provider-timeout per R9a. (2) Live transcript updates with speaker-labeled turns. (3) Candidate optionally takes notes in the scratchpad panel; panel is collapsible. (4) Interviewer asks framework-aware probes targeted at the case structure. (5) Candidate ends the session manually or the AI signals natural conclusion around the 30-min mark.
  - **Operator variant:** When the operator is the candidate, the interviewer LLM uses the operator's private framework library (loaded via R21) instead of the public hardcoded library; otherwise the flow is identical. Operator dogfooding insights shape the V2 public framework-upload feature.
  - **Outcome:** Session ends, transcript preserved client-side, candidate is taken to the post-session summary route (R16a).
  - **Covered by:** R7, R8, R9, R9a, R9b, R10, R11, R13, R14, R15, R16, R20, R21.

*Note on operator workflows.* The V0 voice-provider bakeoff (Cartesia + Sarvam + ElevenLabs comparison) is an operator content/research task, not a product flow — see the "Pre-V1 operator deliverables" subsection under Key Decisions. It is not represented as a Key Flow because it has no candidate-facing surface.

---

## Requirements

**Homepage & marketing surface**
- R1. The site has a public homepage (the default URL) that is the first thing a visitor sees, distinct from the session flow.
- R2. The homepage presents the product visually with a hero (one-line value proposition), 3–4 feature blocks, and a primary CTA to start a session. Feature blocks ship in this reading order with the rationale for each: (1) **voice-native interview** — the differentiated claim, lead with it; (2) **BYO API key transparency** — addresses the obvious trust objection up front so the reader trusts what follows; (3) **framework-aware probes** — proves the AI is not generic; (4) **multi-provider voice testbed (Cartesia / Sarvam / ElevenLabs)** — niche but credible signal for the voice-AI-PM audience. Body copy per block stays under 60 words and avoids generic SaaS verbs ("streamline," "supercharge," "unlock"). One sentence per block headline, one short paragraph below.
- R3. The homepage supports an embedded video of the operator running a real case end-to-end, positioned as social proof.
- R4. Visual design follows a constrained aesthetic system on both homepage and session UI: single-column homepage layout, hero with one-sentence value proposition + one primary CTA only (no testimonials section, no pricing section in V1), body copy under 60 words per feature block, minimum 80px vertical gap between sections, warm cream background `#F7F4ED`, deep warm-black text `#1A1612`, coral accent `#E85D3B`, Instrument Serif for display + Inter for UI body, JetBrains Mono for code/timer.

**Onboarding & access (V1)**
- R5. V1 requires no account creation, no email, and no password. The session can start as soon as the candidate provides API keys.
- R6. BYO API key entry is presented during onboarding before the first session. The candidate retains ownership of their keys; the operator provides no managed-key fallback in V1. Whether the application calls providers directly from the browser or through an ephemeral pass-through proxy is a Key Decision (see Key Decisions) that affects this requirement's truthfulness.
- R6a. Onboarding validates each provided API key synchronously before the session screen renders. Validation calls a lightweight test endpoint on each provider, shows inline format checks (e.g., `sk-` prefix for OpenAI), and surfaces provider-specific error copy (e.g., "Invalid Anthropic key — check at console.anthropic.com"). Session start is gated on all keys returning success.
- R6b. API keys are stored in sessionStorage by default (limits persistence to the tab lifetime). If the candidate opts into "remember on this device" for cross-reload persistence, the page must serve with a Content-Security-Policy header that blocks inline scripts and restricts script-src to a known allowlist; subresource integrity is required on all third-party script tags. Client-side encryption is not in scope; the real mitigation is CSP + SRI on dependencies.
- R6c. Onboarding surfaces an estimated per-session cost range based on the selected providers (drawn from V0 bakeoff data) with a one-line explainer that the bill goes to the candidate's provider accounts, not the operator's. The post-session summary route names approximate token + voice spend for the just-completed session.

**Session UI (three-panel layout)**
- R7. The session screen presents three regions: live transcript (left), voice stage with orb + status (center), scratchpad (right). Visual reference: `pm-interview-buddy/mocks/v2-three-panel.html`.
- R8. The scratchpad is collapsible. Default state is visible but the design must not pressure use. When collapsed, transcript and voice-stage panels split the freed horizontal space in a 2:3 ratio (transcript narrower, voice stage wider). Collapse animates as a 200ms slide.
- R9. The voice stage shows the agent's current state at all times: listening (mic active, user speaking), thinking (AI processing), speaking (AI talking). Status is conveyed through both orb animation and a text label — neither alone is sufficient.
- R9a. The voice stage shows five additional explicit error states beyond R9, each with defined orb behavior + status text + recovery action: (1) **mic-permission-denied** — orb dimmed, red status dot, "Microphone access needed — click to grant" with a re-prompt affordance; (2) **network-drop** — orb greyed, "Connection lost — reconnecting…" with auto-retry; (3) **ASR-no-result** — orb stays in listening, "Didn't catch that — please repeat"; (4) **API-key-invalid** — full-panel error with copy pointing back to onboarding key entry; (5) **provider-timeout** — "Taking longer than usual…" with a retry affordance after 8s.
- R9b. End-to-end voice loop latency must meet p50 < 1.5s and p95 < 2.5s, measured from candidate's listen-end (silence detection) to AI speech-start. Below this threshold, the listening/thinking/speaking states (R9) collapse to indistinguishable from baseline silence, breaking simulation realism. Latency is a V1 ship-gate, not just a comparison metric in the bakeoff (F3).
- R10. The transcript updates in real time as either party speaks, with speaker-labeled turns and auto-scroll to the latest line. Visibility is non-negotiable — the candidate must be able to read it to verify ASR accuracy throughout the session.
- R11. V1 transcript is read-only for inline text editing, but candidates can strike through a mis-captured line to exclude it from the LLM's context window. Mis-captured words are otherwise corrected by re-speaking; the new line stands alongside the mis-captured one. Per-session ASR confidence and re-speak rate are instrumented so "demand for full inline edit" is measurable, not felt.

**Mobile experience (gate, not responsive)**
- R12. Visitors arriving at viewports under 1024px see a full-screen interstitial — not the homepage or session UI — with copy "Mockingbird is built for desktop voice sessions. Open this link on a laptop or desktop to begin." The interstitial includes the current URL as a copyable link so the visitor can send it to themselves. This prevents broken first impressions from X-shared links viewed on mobile without committing to full mobile-responsive UX.

**Interview AI behavior**
- R13. The interviewer LLM plays a Google/Meta PM persona consistently: vision-oriented, customer-obsessed, asks "who is this for, why this not that," remains in character without sycophancy.
- R14. The interviewer asks framework-aware probes — when the candidate skips or weakens a framework step the AI is aware of (from the hardcoded library), the AI surfaces the gap as a follow-up question, not as feedback.
- R15. The interviewer holds the interview frame: does not break character to coach mid-session, does not give pep talks, pushes back on weak answers the way a real Google/Meta PM interviewer would.
- R16. At session end (candidate-initiated or natural conclusion around 30 min), the AI produces a brief prose post-session summary covering structure, strongest moment, and one or two specific framework gaps observed. V1 summary is a short paragraph — not a structured report.
- R16a. The post-session summary appears on a new full-page route (replaces the session screen). The screen contains: (a) the summary paragraph, (b) a copy-to-clipboard action for the summary, (c) session duration, (d) a link to view the full transcript, (e) approximate token + voice spend for the session per R6c, (f) primary CTA "Start another session," (g) loading state while summary generates (3–8s) showing a skeleton paragraph, (h) error state if generation fails — "Summary unavailable — your transcript is still saved below."

**Voice integration & provider abstraction**
- R17. The voice layer is built behind a provider abstraction from V1 — adding a new voice provider does not require changing the rest of the application.
- R18. V1 ships with one provider selected as default, chosen by the V0 Cartesia + Sarvam + ElevenLabs three-way bakeoff. The other two providers ship as switchable options in V1.1.

*The bakeoff itself is a pre-V1 operator deliverable, not a V1 product requirement — see Key Decisions for the publication commitment.*

**Framework awareness (V1)**
- R20. V1 ships with a hardcoded library of common PM frameworks (CIRCLES, AARM, and similar) that the interviewer LLM is aware of. Anonymous candidates do not upload or modify the library in V1.
- R21. The operator's private frameworks load via a server-side-enforced mechanism — either (a) an environment variable injected only at server-render time and never included in any client-side JS bundle, or (b) a route requiring a pre-shared secret in a request header (never URL parameter, never committed to source control). Security-through-obscurity (hidden routes alone, env vars bundled into client JS) is not acceptable.

---

## Acceptance Examples

- AE1. **Covers R9.** Given the session is active and the AI is processing the candidate's last turn, when the candidate glances at the voice stage, both the orb animation and the status text read "thinking" — the candidate can tell at a glance that the AI is processing, not waiting for them to speak.

- AE2. **Covers R14, R15.** Given the candidate jumps directly from clarifying questions to a solution sketch (skipping the "report user needs" step in CIRCLES), when the candidate finishes their answer, the AI's next turn is a probe question ("Before we go further, what user needs are you prioritizing?") and not a feedback statement ("You skipped a step").

- AE3. **Covers R6, R6a.** Given a candidate enters their API keys during onboarding and reloads the page mid-session, when the page reloads, the keys are still available locally — but the in-flight session does not resume. The candidate returns to the case-selection step (F1 step 4) and can restart the case without re-entering keys. V1 explicitly does not support mid-session resume; the transcript from the abandoned session is preserved in browser session storage and viewable from the post-session summary route.

- AE4. **Covers R10, R11.** Given the ASR mis-captures "user research" as "loose research," when the candidate sees the error in the live transcript, V1 does not offer inline text edit — the candidate can either strike through the mis-captured line (excluding it from LLM context per R11) or re-say the phrase, in which case the new line stands alongside the mis-captured one.

- AE5. **Covers R8.** Given the candidate prefers a no-notes approach and collapses the scratchpad, when collapsed, the transcript and voice-stage panels split the freed horizontal space in a 2:3 ratio with a 200ms slide animation — no re-flowing or visual jank.

- AE6. **Covers R9a.** Given the candidate's API key was revoked at the provider between sessions, when the candidate starts a new session, the voice stage immediately enters the **API-key-invalid** error state with a full-panel error and a CTA returning to onboarding — the candidate is never left inside a silent session screen with no feedback.

- AE7. **Covers R12.** Given a visitor opens the production URL on a phone at 390px width, when the page loads, they see the full-screen mobile interstitial (not a broken homepage), and tapping "copy link" copies the URL to their clipboard.

---

## Success Criteria

All Success Criteria below are **aspirational targets**, not V1 ship-gates. V1 ships when the simulator quality bar is met; these criteria measure whether V1 succeeded, not whether V1 launches.

- **Operator weekly use (quality signal):** the operator uses the tool weekly for own PM prep without falling back to friend mocks for at least three consecutive weeks. Initial weeks may use the public hardcoded framework library if R21 (private framework loading) ships later. Operator dogfooding stopping in week 2 (e.g., the operator's interview cycle ends) does not retro-invalidate V1.
- **Adoption (aspirational):** within 30 days of public launch, ~100 unique anonymous candidates run at least one session via primary distribution (operator's @bhavya_barri X presence). Fallback channels in scope if X reach underdelivers: Hacker News Show, ProductHunt, PM-prep Discord communities. Realistic floor if both underperform: ~30 in 30 days, ~100 over V1 lifetime.
- **Launch content reach:** the V0 three-way bakeoff post (Cartesia + Sarvam + ElevenLabs) reaches at least 3 positive engagement signals from PM/AI Twitter accounts (quote-RTs, replies, mentions) within 14 days of posting.
- **Portfolio reach:** the product is referenced in all three PM applications (Sarvam, ElevenLabs, Wispr Flow); at least one recipient acknowledges having tried it. Sarvam and ElevenLabs receive an artifact that uses their API directly via the bakeoff and V1 product; Wispr Flow receives "I built a working voice product and think rigorously about voice UX" as the application signal.
- **Handoff cleanliness:** a downstream implementer (ce-plan agent or developer) reading this doc can begin planning without inventing product behavior, persona shape, UI structure, or provider boundaries.

---

## Scope Boundaries

### Deferred for later

- Other case types beyond Product Design — Estimation, RCA, Strategy, Behavioral (V2+).
- Public-user framework upload UI (V2 candidate, paired with possible Pro launch).
- Vision-based whiteboard / canvas for diagram-driven Product Design cases (V3).
- Authentication, accounts, payments, managed-key infrastructure (V2, required for the try-once-then-paywall mechanic).
- Mobile-native app and full mobile-responsive web. V1 ships the mobile interstitial gate per R12 only.
- Company-specific interviewer personas — Stripe PM, Anthropic PM, Sarvam PM, etc. (V2+).
- **V2 paid-tier candidate features** (none of these are decided composition — they are candidates shaped by V1 usage signal): cross-session memory across sessions; structured (non-prose) feedback report; multi-case-type access; private framework upload UI. Whether any/all of these enter the V2 paid tier depends on what V1 users actually request.
- Multiple voice provider options exposed simultaneously in V1 (only the V0 bakeoff winner ships in V1; V1.1 adds the other two of the Cartesia + Sarvam + ElevenLabs trio as switchable options).
- Full inline transcript editing beyond the strike-through allowed in R11 (revisit only if instrumented data from R11 shows demand).
- Mid-session resume across page reloads (V1 explicitly restarts the case; see AE3).

### Outside this product's identity

- A coaching-first product that interrupts mid-session to teach. This is a simulator — the interview frame is sacred. Feedback comes after, not during.
- A real-time interview-helper overlay (Final Round AI's category). The product is for practice, not for assisting during a live recruiter interview.
- A general-purpose voice agent platform. The product is opinionated around PM interview prep; the provider-pluggable architecture serves that opinionated product, not a generic toolkit.
- A user-generated demo-recording feature. The optional homepage video is the operator's specifically as social proof, not a UGC mechanic.
- Yojana Saathi (voice-first govt scheme discovery for non-literate Bharat users) as a project of continued investment. Remains in the operator's portfolio history but is not the active build. The Sarvam application narrative for this artifact is the empirical voice-provider bakeoff using Sarvam's API, not Yojana Saathi's Bharat-realism angle.
- A Wispr Flow stack integration. Wispr Flow is voice-as-input (dictation), a different category from voice-agent / TTS. The Wispr Flow application signal is voice-product taste demonstrated by the artifact, not "I use Wispr's stack."
- Multi-user / team / org features. Even after paid monetization launches, the product stays single-user.

---

## Key Decisions

- **Product shape is voice interview simulator, not framework-aware coach.** The simulation realism is the headline; framework-awareness is the supporting capability that lets the AI ask sharper probes. Feedback comes after each session, not interleaved. Rationale: clearer product positioning and stronger differentiation from generic AI prep tools.
- **Working name "Mockingbird" is a placeholder.** Final brand name decided closer to launch when positioning is sharper. Does not block planning.
- **Interviewer persona is Google/Meta PM style for V1.** Most common and recognizable PM interview persona; sets a clear quality bar. Company-specific personas come in V2+ when there's evidence of demand.
- **Session duration target ~30 minutes.** Matches a real Product Design interview block; bounds voice-infrastructure cost per session; produces enough material for a meaningful feedback summary.
- **V1 onboarding is BYO API key, no account, no payment.** Lowest possible friction; zero operator inference cost (modulo the proxy-or-direct decision below); aligns with "real prep tool I'll use weekly" positioning. The try-once-then-paywall mechanic requires auth + managed keys, which is meaningful infrastructure not justified at V1.
- **V2 monetization is try-once-free then paywall to subscription**, not freemium-with-Pro-upgrade. Clearer activation funnel and higher commitment signal from paying users.
- **Voice layer is provider-pluggable from V1, not as a V2 refactor.** The product's secondary purpose (empirical voice-provider comparison) only works if the architecture supports it from launch. Doing this later would mean every new provider integration is a meaningful refactor.
- **V1 default voice provider chosen by V0 bakeoff, not chosen up-front.** Running the comparison empirically is the right professional move and the comparison itself becomes the launch content artifact.
- **Multi-application portfolio strategy.** The artifact serves three PM applications with explicit per-target framing:
  - **Sarvam application:** The product uses Sarvam's voice API as one of three V0 bakeoff providers and as a V1/V1.1 production option. The application signal is "I built a working voice product on Sarvam's stack and benchmarked it empirically."
  - **ElevenLabs application:** The product uses ElevenLabs' voice API as one of three V0 bakeoff providers and as a V1/V1.1 production option. The application signal is "I built a working voice product using ElevenLabs and benchmarked it empirically."
  - **Wispr Flow application:** The product does not use Wispr's stack (Wispr is voice-as-input, a different category). The application signal is "I built a working voice product and think rigorously about voice UX trade-offs" — Wispr Flow application reads the artifact as voice-product taste, not as a tech demo of their stack.
- **Bakeoff publishing posture.** If the V0 three-way bakeoff produces a result where any single provider loses meaningfully on English/American interview prep, the writeup will explicitly frame the workload (American-accent English, 30-min PM case, single voice) so the result is not read as a general provider-quality judgment. Results are published regardless of winner; the bakeoff's professional credibility depends on this commitment to publish honestly even when the optics are unfavorable for an application target.
- **V2 paid-tier feature composition is deliberately not specified at V1 brainstorm time.** Candidate features (cross-session memory, private framework upload, structured feedback report, multi-case-type access) are listed in Deferred as V2 candidates, not as decided composition. The actual paid tier shape is shaped by V1 usage signal — predetermining it before V1 ships forces V1 implementers into speculative infra prep.
- **BYO API key architecture (browser-direct vs proxy) is a Key Decision, not a planning detail.** The choice between pure client-side direct-to-provider calls and ephemeral pass-through proxy affects R6's "no managed-key fallback" truthfulness and the V1 "zero operator inference cost" premise. Per-provider browser-origin API support must be verified before R6 is treated as feasible — Anthropic and OpenAI both default-deny browser-origin calls today. The branch decision:
  - **If all V1 providers support browser-origin calls:** pure client-side; candidate keys never reach operator infrastructure (matches R6 framing).
  - **If any V1 provider does not:** ephemeral pass-through proxy is required; R6 framing must be updated to acknowledge keys briefly traverse operator servers; operator hosting/bandwidth cost replaces token cost as the V1 operator cost item.
- **Web app, desktop-first; mobile is gated, not responsive.** Focused 30-min practice sessions are a desktop behavior. R12 ships a mobile interstitial (not broken UX, not full responsive) — the minimum that prevents catastrophic first impressions from X-shared links without committing to mobile-native voice UX work.
- **The optional homepage video is the operator's specifically.** A real demo of the product owner using their own product is the strongest signal for an indie launch; UGC video would add product surface (moderation, hosting, abuse) for unclear gain at V1.
- **Session UI is the three-panel layout — not Immersive Voice or Notebook variants.** Anonymous candidates need real-time visibility into both voice status (R9) and ASR accuracy (R10) to trust the simulation; Immersive Voice hides the transcript and erodes trust; Notebook makes the scratchpad mandatory, which contradicts the "scratchpad optional" decision (R8). Three-panel satisfies all three.

---

## Pre-V1 Operator Deliverables

These are operator research and content tasks that complete before V1 ships. They are NOT V1 product requirements — they exist outside the requirements list so V1 cannot be "blocked" by a content artifact.

- **V0 voice-provider bakeoff.** Operator runs the same case + same LLM transcript through Cartesia, Sarvam, and ElevenLabs using the operator's own private case set + the operator's own speech (no anonymous candidate sessions, since V1 has no consent flow for transcript reuse). Captures end-to-end latency, audio samples, ASR accuracy on operator's speech, cost per session per provider.
- **V0 bakeoff writeup published on X.** Three-way comparison post with audio embeds and the bakeoff-publishing-posture commitment from Key Decisions (results published regardless of winner; workload framed explicitly to avoid being read as a general provider-quality judgment). Bakeoff winner becomes V1 default per R18.
- **V1 launch announcement on X.** References the bakeoff writeup and the operator's PM application context. Drives primary distribution toward the ~100-user adoption target.

---

## Dependencies / Assumptions

- The chosen LLM provider (likely Anthropic Claude or OpenAI GPT — selected during planning) supports a low-latency voice-shaped conversational loop, holds persona consistently, and accepts the framework library as natural-language system context.
- Cartesia and Sarvam both offer documented APIs accessible with developer keys as of the build date. ElevenLabs likewise for V1.1.
- The hardcoded common-PM-framework library can be expressed as natural-language instructions to the interviewer LLM — no specialized fine-tuning or RAG infrastructure is required for V1.
- The operator can record and edit the demo video themselves; no external production budget is needed.
- The operator's @bhavya_barri X presence and active PM/AI Twitter community are sufficient to reach the ~100-user V1 success threshold organically — or, failing that, fallback channels (HN Show, ProductHunt, PM-prep Discord) close the gap. No paid distribution is in scope.
- **V2 try-once-then-paywall monetization assumes the framework-aware probe quality, post-session summary depth, and voice realism are differentiated enough vs free ChatGPT voice mode to justify a paid subscription.** This is the key V2 risk to validate during V1 usage; if V1 signal contradicts the differentiation premise, V2 monetization may need re-specification.
- **V2 managed-key infrastructure (when paywall launches) must define, before V2 planning begins:** credential storage encrypted at rest, separated from the application DB; per-user key scoping; rotation policy; audit logging. This is a pre-condition for V2, not an implementation detail to discover mid-sprint.

---

## Outstanding Questions

### Resolve Before Planning

*(none — planning is unblocked)*

### Deferred to Planning

- [Affects R13, R14, R15][Technical] Which LLM provider is the V1 backend for the interviewer (Anthropic Claude, OpenAI GPT, or other). Depends on cost per session, voice-loop latency (R9b), and persona-holding consistency. Best resolved via short empirical comparison during planning.
- [Affects R17, R18][Technical] Shape of the provider-abstraction interface. Cartesia is primarily a TTS/STT component vendor; Sarvam exposes both components and a higher-level conversational agent; ElevenLabs Conversational AI is an end-to-end agent that owns the LLM turn loop. The "smallest common interface" may need to be **capability-tiered** (one tier for component providers, one for end-to-end agents) rather than uniform — and R14 framework-aware probes depend on every provider exposing a system-prompt injection path. Decide during planning whether V1 compares component-level layers (application owns turn-taking) or end-to-end agents (framework-prompt injection paths must be confirmed per candidate).
- [Affects R6, R6a, R6b][Technical] Which provider browser-origin policies the BYO direct-vs-proxy Key Decision rests on must be verified per provider during planning — Anthropic, OpenAI, Cartesia, Sarvam, ElevenLabs each have different stances.
- [Affects R3][Needs research] Where the optional homepage video is hosted (self-hosted MP4 vs YouTube embed vs Mux vs other). YouTube embeds load third-party JS that conflicts with the strict CSP required by R6b; if YouTube is selected, the homepage and session pages may need separate CSPs.
- [Affects R16][Needs research] Whether the V1 prose post-session summary should be generated by the same interviewer LLM in a separate "now coach" prompt, or by a second model with explicit feedback prompting.
- [Affects R13, R15][User decision] Character-break recovery posture — when the interviewer LLM breaks character (responds with "I'm an AI assistant" or similar), the V1 behavior is: silent retry with stronger system prompt, automatic in-character redirect, or graceful session-pause-and-resume? Set an expected break rate as a V1 quality bar (e.g., fewer than 1 break per 10 evaluation sessions before launch).
- [Affects R21][Technical] Mechanism for loading the operator's private frameworks — env-var-at-server-render vs pre-shared-secret-header — chosen during planning.
