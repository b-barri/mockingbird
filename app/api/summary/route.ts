import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  assembleSummaryUserMessage,
  parseFeedback,
  summarySystemPrompt,
} from "@/lib/llm/summary";
import { getCaseById } from "@/lib/llm/prompts/case-templates";
import { rateLimit } from "@/lib/rate-limit";
import type { Turn } from "@/lib/voice/state-machine";

export const runtime = "edge";

interface SummaryRequest {
  caseId: string;
  turns: Turn[];
}

// POST /api/summary
// Header: X-LLM-Key (pass-through, never stored)
// Body:   { caseId, turns }
// Response: application/json — StructuredFeedback or { error }
//
// Generates the structured tension-grounded summary (4 dimension cards + two
// prose paragraphs) using a "now coach" system prompt distinct from the
// interview persona. Buffered JSON response, not streaming — the LLM output
// is a single JSON object that can't be usefully rendered until complete.

export async function POST(request: Request): Promise<Response> {
  // 10/min/IP is plenty — a session only generates one summary.
  const rl = await rateLimit(request, "summary");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${rl.retryAfter}s.` },
      {
        status: 429,
        headers: {
          "retry-after": String(rl.retryAfter),
          "x-ratelimit-limit": String(rl.limit),
          "x-ratelimit-remaining": "0",
        },
      }
    );
  }

  const apiKey = request.headers.get("x-llm-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-LLM-Key header" },
      { status: 401 }
    );
  }

  let body: SummaryRequest;
  try {
    body = (await request.json()) as SummaryRequest;
  } catch {
    return NextResponse.json(
      { error: "Malformed request body" },
      { status: 400 }
    );
  }

  const caseTemplate = getCaseById(body.caseId);
  if (!caseTemplate) {
    return NextResponse.json(
      { error: `Unknown case id: ${body.caseId}` },
      { status: 404 }
    );
  }

  const userMessage = assembleSummaryUserMessage({
    caseTemplate,
    turns: body.turns ?? [],
  });

  let anthropic: Anthropic;
  try {
    anthropic = new Anthropic({ apiKey });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not initialize Anthropic client: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
      { status: 500 }
    );
  }

  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      // Bumped from 700 — JSON adds structural overhead beyond the 280-word
      // prose budget; 1200 leaves comfortable headroom without runaway cost.
      max_tokens: 1200,
      system: summarySystemPrompt(),
      messages: [{ role: "user", content: userMessage }],
    });
    rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    return NextResponse.json(
      {
        error: `Summary LLM error: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
      { status: 502 }
    );
  }

  try {
    const feedback = parseFeedback(rawText);
    return NextResponse.json(feedback);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not parse coach response: ${
          err instanceof Error ? err.message : "unknown"
        }`,
        // Surface raw text in dev so the implementer can see what the LLM
        // actually returned. Production candidates see the friendly error
        // message in the summary card's error state.
        raw: rawText,
      },
      { status: 502 }
    );
  }
}
