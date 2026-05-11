import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getActiveFrameworks } from "@/lib/auth/private-frameworks";
import {
  assembleSystemPrompt,
  detectPersonaBreak,
  turnsToMessages,
} from "@/lib/llm/interviewer";
import { getCaseById } from "@/lib/llm/prompts/case-templates";
import type { Turn } from "@/lib/voice/state-machine";

export const runtime = "edge";

interface InterviewRequest {
  caseId: string;
  turns: Turn[];
}

// POST /api/interview
//
// Body: { caseId, turns }
// Headers:
//   X-LLM-Key (required) — candidate's Anthropic API key, pass-through only
//   X-Operator-Token (optional) — when matched, swaps private frameworks in
//
// Response: text/event-stream with chunks { text } and a final
//   { telemetry: 'persona_break' } when the LLM dropped character.
//
// The candidate's key is used in this single request only; the route is
// stateless and the key is not stored anywhere on the server (per BYO
// direct-vs-proxy Key Decision in the plan). The proxy exists because
// Anthropic default-denies browser-origin API calls in 2026.

export async function POST(request: Request): Promise<Response> {
  const apiKey = request.headers.get("x-llm-key");
  const operatorToken = request.headers.get("x-operator-token");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-LLM-Key header" },
      { status: 401 }
    );
  }

  let body: InterviewRequest;
  try {
    body = (await request.json()) as InterviewRequest;
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

  const frameworks = getActiveFrameworks(operatorToken);
  const systemPrompt = assembleSystemPrompt({
    caseTemplate,
    frameworks,
  });
  const messages = turnsToMessages(body.turns ?? []);

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
      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        const completion = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const event of completion) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: chunk })}\n\n`
              )
            );
          } else if (event.type === "message_start") {
            inputTokens = event.message.usage?.input_tokens ?? 0;
          } else if (event.type === "message_delta") {
            // Anthropic emits cumulative output_tokens on each message_delta.
            outputTokens = event.usage?.output_tokens ?? outputTokens;
          }
        }

        // Post-stream persona-break check — fires as telemetry only at V1.
        // Recovery behavior (silent retry, in-character redirect, session
        // pause) is the deferred Outstanding Question per the plan.
        const breakResult = detectPersonaBreak(fullText);
        if (breakResult.broke) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                telemetry: "persona_break",
                matchedTrigger: breakResult.matchedTrigger,
              })}\n\n`
            )
          );
        }

        // Emit token usage so the client cost tracker (U9) can accumulate
        // real numbers per turn. Headers commit before token counts are
        // known, so usage rides as a structured SSE event before [DONE].
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              usage: {
                input_tokens: inputTokens,
                output_tokens: outputTokens,
              },
            })}\n\n`
          )
        );

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown LLM error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: message })}\n\n`
          )
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
      connection: "keep-alive",
    },
  });
}
