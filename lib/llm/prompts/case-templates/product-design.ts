// Product Design case templates. V1 ships ONE case type per the requirements
// doc; multiple cases-per-type are listed here so the case-select screen has
// real choices. Each case is a self-contained prompt the interviewer LLM
// receives at session start.
//
// Prompts are intentionally MINIMAL — one sentence, no context, no hints,
// no probe questions. The interviewer reads this verbatim as the case
// statement and stops; the candidate's clarification turns are what drive
// the discovery of audience, needs, constraints. Adding context or hints
// here would short-circuit that — the candidate would skip the clarification
// step entirely.

export interface CaseTemplate {
  readonly id: string;
  readonly type: "product-design";
  readonly title: string;
  readonly brief: string;
  readonly prompt: string;
  /** Estimated session length in minutes. */
  readonly estimatedMinutes: number;
}

export const PRODUCT_DESIGN_CASES: ReadonlyArray<CaseTemplate> = [
  {
    id: "meditation-app",
    type: "product-design",
    title: "Design a meditation app for elderly users",
    brief: "Open-ended; candidate clarifies the audience and core need.",
    prompt: `Design a meditation app for elderly users.`,
    estimatedMinutes: 30,
  },
  {
    id: "spotify-kids",
    type: "product-design",
    title: "Design Spotify for kids under 10",
    brief: "Music + audio for elementary-school children. Candidate frames safety vs engagement.",
    prompt: `Design Spotify for kids under 10.`,
    estimatedMinutes: 30,
  },
  {
    id: "airbnb-host-noshow",
    type: "product-design",
    title: "Help Airbnb hosts handle no-shows",
    brief: "Host-side feature. Candidate frames the signals + actions + payout angle.",
    prompt: `Design a feature for Airbnb hosts dealing with guest no-shows.`,
    estimatedMinutes: 30,
  },
  {
    id: "calendar-for-deep-work",
    type: "product-design",
    title: "Design a calendar app for deep work",
    brief: "Protect focus time. Candidate frames meeting-defense vs scheduling.",
    prompt: `Design a calendar app for deep work.`,
    estimatedMinutes: 30,
  },
];

export function getCaseById(id: string): CaseTemplate | undefined {
  return PRODUCT_DESIGN_CASES.find((c) => c.id === id);
}

export function pickRandomCase(): CaseTemplate {
  const idx = Math.floor(Math.random() * PRODUCT_DESIGN_CASES.length);
  return PRODUCT_DESIGN_CASES[idx];
}
