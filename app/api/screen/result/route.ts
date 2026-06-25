import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { fetchCallDetails, RinggApiError } from "@/lib/ringg/call-details";
import { scoreScreening } from "@/lib/screen/score";
import type { Brief } from "@/lib/screen/brief";

// Node runtime: fetches the Ringg transcript then runs a buffered Anthropic
// scoring call — same reasoning as /api/research (serial external work that can
// exceed the Edge window; server-only modules need Node).
export const runtime = "nodejs";

interface ResultRequest {
  callId?: string;
  brief?: Brief;
}

// POST /api/screen/result
// Header: X-LLM-Key  — Anthropic key for scoring (pass-through, never stored)
// Body:   { callId, brief }
// Env:    RINGG_API_KEY — workspace key for the call-details lookup
//
// The widget's "ended" event fires BEFORE Ringg finishes processing the
// transcript, so this does a single fetch and, if the transcript isn't ready,
// returns { status: "pending" } for the client to poll again — keeping each
// request short (serverless-friendly) and avoiding wasted scoring calls.
export async function POST(request: Request): Promise<Response> {
  const rl = await rateLimit(request, "research");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } }
    );
  }

  const apiKey = request.headers.get("x-llm-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-LLM-Key header" },
      { status: 401 }
    );
  }

  const ringgKey = process.env.RINGG_API_KEY;
  if (!ringgKey) {
    return NextResponse.json(
      { error: "Server is missing RINGG_API_KEY — cannot fetch the transcript." },
      { status: 500 }
    );
  }

  let body: ResultRequest;
  try {
    body = (await request.json()) as ResultRequest;
  } catch {
    return NextResponse.json(
      { error: "Malformed request body" },
      { status: 400 }
    );
  }

  const callId = body.callId?.trim();
  if (!callId || !body.brief) {
    return NextResponse.json(
      { error: "callId and brief are required." },
      { status: 400 }
    );
  }

  let details;
  try {
    details = await fetchCallDetails(callId, ringgKey);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof RinggApiError
            ? err.message
            : `Could not fetch the call: ${
                err instanceof Error ? err.message : "unknown"
              }`,
      },
      { status: 502 }
    );
  }

  // Not finished processing yet — tell the client to poll again.
  if (details.callStatus !== "completed" || details.entries.length === 0) {
    return NextResponse.json({ status: "pending" });
  }

  const result = await scoreScreening({
    brief: body.brief,
    entries: details.entries,
    apiKey,
  });

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  if (result.status === "unscorable") {
    return NextResponse.json({ status: "unscorable" });
  }
  return NextResponse.json({ status: "scored", feedback: result.feedback });
}
