import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Brief,
  ScreeningQuestion,
  EvalParameter,
  CompanySignal,
} from "@/lib/screen/brief";
import { fetchCompanySite } from "@/lib/research/sources";

// Research → structured Brief.
//
// Takes the candidate's inputs (company, role, JD, optional URL), gathers
// best-effort sources (the company site today), and synthesizes a Brief with
// Claude. Graceful degradation is a hard requirement (origin R4): when there's
// no company-specific signal, the brief is honest role/JD prep with
// `companySpecific: false` flags and `hasCompanySignal: false` — never
// fabricated company detail.

export interface ResearchInput {
  company: string;
  role: string;
  jobDescription: string;
  companyUrl?: string;
  apiKey: string;
}

const RESEARCH_SYSTEM_PROMPT = `You are a research analyst preparing a candidate for a company's screening interview. You produce a tailored prep brief from the inputs given.

You receive: the company name, the role, the job description, and (optionally) extracted text from the company's website.

OUTPUT FORMAT: Return ONLY a single JSON object matching this exact schema. No preamble, no markdown code fence.

{
  "likelyQuestions": [{"question": "<string>", "rationale": "<why likely, one sentence>", "companySpecific": <true|false>}],
  "evalParameters": [{"name": "<short noun phrase>", "description": "<what a strong answer looks like>"}],
  "companySignals": [{"point": "<a company-specific thing a strong candidate references>", "companySpecific": <true|false>}],
  "candidateGaps": ["<a likely gap vs the JD>"],
  "hasCompanySignal": <true|false>
}

Rules:
- 4-8 likelyQuestions. 3-6 evalParameters (these become the feedback dimensions — name them as the screen would actually score: e.g. "Product sense", "Prioritization rigor", "Communication"). 0-6 companySignals. 1-5 candidateGaps.
- Set companySpecific:true ONLY when an item is grounded in the actual company/product/website text — its product, recent launches, positioning, stated values. Generic role/JD prep is companySpecific:false.
- If the inputs give you NO real company-specific signal (no useful website text, nothing distinctive about the company), set hasCompanySignal:false, return an empty companySignals array, and base everything on the role and JD. DO NOT invent company facts, product names, or launches. Honest generic prep beats fabricated specificity.
- Never include numeric scores or framework acronyms.`;

export function researchSystemPrompt(): string {
  return RESEARCH_SYSTEM_PROMPT;
}

export function assembleResearchUserMessage(args: {
  company: string;
  role: string;
  jobDescription: string;
  siteText: string | null;
}): string {
  const site = args.siteText
    ? `Company website text (extracted):\n${args.siteText}`
    : `Company website text: (none available — no company-specific signal from the site)`;
  return `Company: ${args.company}
Role: ${args.role}

Job description:
${args.jobDescription}

${site}

Produce the prep brief as JSON.`;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asBool(v: unknown): boolean {
  return v === true;
}

export interface BriefMeta {
  id: string;
  company: string;
  role: string;
  companyUrl?: string;
  generatedAt: number;
}

/**
 * Parse the LLM JSON into a Brief. Lenient and defensive — coerces item shapes,
 * defaults `companySpecific` to false (never claim company-specificity the model
 * didn't assert), and recomputes `hasCompanySignal` so it can't contradict the
 * actual content. Throws only when the response is unusable.
 */
export function parseBriefResponse(raw: string, meta: BriefMeta): Brief {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonStr = fence ? fence[1] : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Could not parse brief as JSON: ${
        err instanceof Error ? err.message : "unknown"
      }`
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Brief JSON must be an object");
  }
  const o = parsed as Record<string, unknown>;

  const likelyQuestions: ScreeningQuestion[] = Array.isArray(o.likelyQuestions)
    ? o.likelyQuestions
        .map((q) => {
          const r = (q ?? {}) as Record<string, unknown>;
          return {
            question: asString(r.question),
            rationale: asString(r.rationale),
            companySpecific: asBool(r.companySpecific),
          };
        })
        .filter((q) => q.question.length > 0)
    : [];

  const evalParameters: EvalParameter[] = Array.isArray(o.evalParameters)
    ? o.evalParameters
        .map((p) => {
          const r = (p ?? {}) as Record<string, unknown>;
          return { name: asString(r.name), description: asString(r.description) };
        })
        .filter((p) => p.name.length > 0)
    : [];

  if (evalParameters.length === 0) {
    throw new Error("Brief must contain at least one eval parameter");
  }

  const companySignals: CompanySignal[] = Array.isArray(o.companySignals)
    ? o.companySignals
        .map((s) => {
          const r = (s ?? {}) as Record<string, unknown>;
          return { point: asString(r.point), companySpecific: asBool(r.companySpecific) };
        })
        .filter((s) => s.point.length > 0)
    : [];

  const candidateGaps: string[] = Array.isArray(o.candidateGaps)
    ? o.candidateGaps.map(asString).filter((g) => g.length > 0)
    : [];

  // Recompute, never trust a flag that contradicts content: a brief "has
  // company signal" only if something is actually marked company-specific.
  const hasCompanySignal =
    asBool(o.hasCompanySignal) &&
    (companySignals.some((s) => s.companySpecific) ||
      likelyQuestions.some((q) => q.companySpecific));

  return {
    id: meta.id,
    company: meta.company,
    role: meta.role,
    companyUrl: meta.companyUrl,
    likelyQuestions,
    evalParameters,
    companySignals,
    candidateGaps,
    hasCompanySignal,
    generatedAt: meta.generatedAt,
  };
}

/** Full orchestration: gather sources (time-boxed), synthesize, parse. */
export async function generateBrief(input: ResearchInput): Promise<Brief> {
  // Source gathering is best-effort and non-fatal — a blocked/failed site
  // fetch just means thinner signal, not a failed brief.
  let siteText: string | null = null;
  if (input.companyUrl && input.companyUrl.trim().length > 0) {
    const site = await fetchCompanySite(input.companyUrl);
    if (site.ok && site.text) siteText = site.text;
  }

  const anthropic = new Anthropic({ apiKey: input.apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: researchSystemPrompt(),
    messages: [
      {
        role: "user",
        content: assembleResearchUserMessage({
          company: input.company,
          role: input.role,
          jobDescription: input.jobDescription,
          siteText,
        }),
      },
    ],
  });
  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return parseBriefResponse(rawText, {
    id: crypto.randomUUID(),
    company: input.company,
    role: input.role,
    companyUrl: input.companyUrl,
    generatedAt: Date.now(),
  });
}
