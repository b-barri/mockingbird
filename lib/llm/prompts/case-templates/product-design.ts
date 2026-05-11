// Product Design case templates. V1 ships ONE case type per the requirements
// doc; multiple cases-per-type are listed here so the case-select screen has
// real choices. Each case is a self-contained prompt the interviewer LLM
// receives at session start.
//
// Case bodies are intentionally short — the interviewer LLM expands them
// during the session through clarifying questions and probes (R14).
// Case metadata (id, title, brief) is what the case-select UI in U5 reads.

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
    brief:
      "65+ users who know meditation can help but find existing apps cluttered.",
    prompt: `Design a meditation app for elderly users. The target audience is 65+ adults who have heard meditation can help with sleep and anxiety, but find apps like Calm and Headspace overwhelming. Focus on a product that reduces decision fatigue and makes habit formation easy.`,
    estimatedMinutes: 30,
  },
  {
    id: "spotify-kids",
    type: "product-design",
    title: "Design Spotify for kids under 10",
    brief:
      "A safe, age-appropriate music + audio experience for elementary-school children.",
    prompt: `Design Spotify for kids under 10. The product needs to feel native to a 7-year-old (not a "kids mode" bolted on), prevent exposure to age-inappropriate content, and give parents enough visibility to trust it. Think about discovery, parental controls, and engagement loops appropriate to this age range.`,
    estimatedMinutes: 30,
  },
  {
    id: "airbnb-host-noshow",
    type: "product-design",
    title: "Help Airbnb hosts handle no-shows",
    brief: "A feature to support hosts when guests don't arrive as expected.",
    prompt: `Design a feature for Airbnb hosts dealing with guest no-shows. When a guest doesn't arrive or check in, the host loses revenue and may feel powerless. What signals indicate a no-show? What actions should hosts have access to? What happens to the guest's account and the host's payout?`,
    estimatedMinutes: 30,
  },
  {
    id: "calendar-for-deep-work",
    type: "product-design",
    title: "Design a calendar app for deep work",
    brief:
      "A calendar optimized for protecting focus time, not just scheduling meetings.",
    prompt: `Design a calendar app optimized for deep work. Most calendars are good at adding meetings but bad at protecting focus time. Knowledge workers complain about meeting saturation and constant context-switching. How does the product help defend against meeting creep while still working as a primary calendar?`,
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
