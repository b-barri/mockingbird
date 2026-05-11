import { NextResponse } from "next/server";
import { checkFormat, providerLabel } from "@/lib/auth/key-validation";

export const runtime = "edge";

interface ValidateRequest {
  provider: string;
  key: string;
}

interface ValidateResponse {
  ok: boolean;
  provider: string;
  /** Provider-specific error copy when ok=false (R6a). */
  error?: string;
}

// V1 validation: client-side format check + a short server-side ping per
// supported provider. For non-Anthropic providers V1 ships format-only
// validation since their adapters (U2) are stubs; real ping validation
// lands incrementally as adapters are implemented during the V0 bakeoff.
//
// Per the BYO direct-vs-proxy Key Decision, the key arrives in the request
// body, is used in this single Edge invocation to reach the upstream, and
// is never persisted server-side.

export async function POST(request: Request): Promise<NextResponse<ValidateResponse>> {
  let body: ValidateRequest;
  try {
    body = (await request.json()) as ValidateRequest;
  } catch {
    return NextResponse.json(
      { ok: false, provider: "?", error: "Malformed request body." },
      { status: 400 }
    );
  }

  const { provider, key } = body;
  if (!provider || !key) {
    return NextResponse.json(
      {
        ok: false,
        provider: provider ?? "?",
        error: "Provider and key are required.",
      },
      { status: 400 }
    );
  }

  const format = checkFormat(provider, key);
  if (!format.ok) {
    return NextResponse.json({
      ok: false,
      provider,
      error: format.reason,
    });
  }

  // V1: real ping for Anthropic, format-only for the rest. Stub providers
  // return ok=true at this stage; real ping validation lands when the
  // matching adapter ships full implementation.
  if (provider === "anthropic") {
    const ok = await pingAnthropic(key);
    if (!ok) {
      return NextResponse.json({
        ok: false,
        provider,
        error: `Invalid ${providerLabel(provider)} key — the provider rejected it. Check at console.anthropic.com.`,
      });
    }
  }

  return NextResponse.json({ ok: true, provider });
}

async function pingAnthropic(key: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    // Anthropic returns 200 OK on success or 401 on invalid key.
    return response.status === 200;
  } catch {
    // Network errors → assume the key is fine, surface failure at runtime.
    return true;
  }
}
