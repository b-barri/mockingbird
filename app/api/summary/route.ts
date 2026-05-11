import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  assembleSummaryUserMessage,
  summarySystemPrompt,
} from "@/lib/llm/summary";
import { getCaseById } from "@/lib/llm/prompts/case-templates";
import type { Turn } from "@/lib/voice/state-machine";

export const runtime = "edge";

interface SummaryRequest {
  caseId: string;
  turns: Turn[];
}

// POST /api/summary
// Header: X-LLM-Key (pass-through, never stored)
// Body: { caseId, turns }
// Response: text/event-stream — chunks { text } until [DONE]
//
// Generates the R16 post-session summary using a "now coach" system prompt
// distinct from the interview persona. Reuses Anthropic Claude with the
// candidate's key.

export async function POST(request: Request): Promise<Response> {
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: summarySystemPrompt(),
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of completion) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown summary-LLM error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
    },
  });
}
