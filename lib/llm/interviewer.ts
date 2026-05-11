import type { Turn } from "@/lib/voice/state-machine";
import type { CaseTemplate } from "@/lib/llm/prompts/case-templates";
import {
  renderPersonaWithCase,
} from "@/lib/llm/prompts/persona-google-meta-pm";
import {
  renderFrameworkLibrary,
  type FrameworkSpec,
} from "@/lib/llm/prompts/framework-library";

// Interviewer LLM orchestration. Pure functions for prompt assembly +
// post-processing — the network calls live in app/api/interview/route.ts.

export interface AssemblePromptInput {
  caseTemplate: CaseTemplate;
  frameworks: ReadonlyArray<FrameworkSpec>;
}

/** Assemble the full system prompt sent to Claude. */
export function assembleSystemPrompt(input: AssemblePromptInput): string {
  const frameworkSection = renderFrameworkLibrary(input.frameworks);
  return renderPersonaWithCase(
    {
      title: input.caseTemplate.title,
      body: input.caseTemplate.prompt,
    },
    frameworkSection
  );
}

/** Convert session turns to Anthropic message-history format. Stricken
 *  turns are excluded per R11 (the LLM never sees them). */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export function turnsToMessages(
  turns: ReadonlyArray<Turn>
): AnthropicMessage[] {
  return turns
    .filter((t) => !t.stricken && !t.partial)
    .map((t) => ({
      role: t.speaker === "user" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
}

// Persona-break detection. Triggers come from R13 + R15 — these are the
// shapes that indicate the LLM has dropped the Alex persona and reverted
// to its trained AI-assistant identity.
const PERSONA_BREAK_TRIGGERS: ReadonlyArray<RegExp> = [
  /\bas an? ai\b/i,
  /\bi'?m an? ai\b/i,
  /\bi am an? ai\b/i,
  /\blanguage model\b/i,
  /\bai assistant\b/i,
  /\bi don'?t have (personal|real|actual)\b/i,
  /\bi cannot (actually|really)\b/i,
  /\bi'?m (just |only )?an? (chatbot|virtual)\b/i,
  /\bmy training data\b/i,
];

export interface PersonaBreakResult {
  broke: boolean;
  matchedTrigger?: string;
}

export function detectPersonaBreak(text: string): PersonaBreakResult {
  for (const trigger of PERSONA_BREAK_TRIGGERS) {
    if (trigger.test(text)) {
      return { broke: true, matchedTrigger: trigger.source };
    }
  }
  return { broke: false };
}

/** Public list of trigger patterns for test introspection. */
export const PERSONA_BREAK_TRIGGER_PATTERNS = PERSONA_BREAK_TRIGGERS;
