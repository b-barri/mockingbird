// Maps a research Brief into the custom variables injected into the Ringg
// screening assistant at call time.
//
// In the manual dashboard test these five values were pasted by hand into the
// "Test Web Call" panel; in the app-driven flow (U6 Ringg client / U7 trigger)
// this function produces them from the brief the research engine already
// generates — the one line of glue between the shipped engine and a live call.

import type { Brief } from "./brief";

/**
 * Custom variables for the Ringg screening assistant. Keys MUST match the
 * variable names configured on the assistant (referenced as @{{var}} in its
 * First message, Objective, and Conversation Script). Renaming a key here
 * without renaming it on the assistant silently breaks injection.
 */
export interface RinggCallVariables {
  readonly callee_name: string;
  readonly role: string;
  readonly company: string;
  /** Numbered list of the screening questions the interviewer should ask. */
  readonly questions: string;
  /**
   * What the interviewer listens for — built from the eval parameters, which
   * are the SAME dimensions the feedback later scores (see briefToRubric).
   * Sourcing both from evalParameters keeps the interview and the score aligned.
   */
  readonly signals: string;
}

const FALLBACK_QUESTIONS =
  "1. Tell me about your background and what you're working on now. " +
  "2. Walk me through a product or project you owned end to end. " +
  "3. What's a hard tradeoff you made, and how did it turn out? " +
  "4. Why are you interested in this role?";

const FALLBACK_SIGNALS =
  "product sense (reasons from user need, not features); structured, concise communication; fit for the role.";

/**
 * Build the Ringg custom variables from a brief and the candidate's name.
 *
 * `questions` comes from the brief's likely questions (the must-asks the
 * interviewer reads aloud — rationale is intentionally omitted, it's not spoken).
 * `signals` comes from the eval parameters. Both degrade to sensible defaults so
 * a thin brief (or one where research found little) still yields a usable call.
 * `callee_name` defaults to a friendly generic so the opener never says "Hi ,".
 */
export function briefToRinggVariables(
  brief: Brief,
  calleeName?: string
): RinggCallVariables {
  const questions = brief.likelyQuestions.length
    ? brief.likelyQuestions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")
    : FALLBACK_QUESTIONS;

  const signals = brief.evalParameters.length
    ? brief.evalParameters.map((p) => `${p.name} (${p.description})`).join("; ")
    : FALLBACK_SIGNALS;

  return {
    callee_name: calleeName?.trim() || "there",
    role: brief.role,
    company: brief.company,
    questions,
    signals,
  };
}
