import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/voice/synthesize
//
// Body: JSON { text }
// Headers:
//   X-Voice-Key (required) — candidate's voice provider key, pass-through only
//   X-Voice-Provider (required) — currently only "sarvam"
//
// Response: { audios: string[], contentType: "audio/mpeg" }
//   audios are base64-encoded MP3 chunks (Sarvam returns an array because long
//   text gets split across multiple synthesis windows). The client concatenates
//   them client-side via useAudioPlayer.
//
// Sarvam bulbul:v2 max text length is 1500 characters. The route truncates
// rather than rejects so a long AI turn still gets *most* of its audio.

const SARVAM_BULBUL_V2_MAX_CHARS = 1500;

export async function POST(request: Request): Promise<Response> {
  const voiceKey = request.headers.get("x-voice-key");
  if (!voiceKey) {
    return NextResponse.json(
      { error: "Missing X-Voice-Key header" },
      { status: 401 }
    );
  }

  const provider = (
    request.headers.get("x-voice-provider") ?? "sarvam"
  ).toLowerCase();
  if (provider !== "sarvam") {
    return NextResponse.json(
      {
        error: `Voice provider "${provider}" is not yet implemented for synthesis.`,
      },
      { status: 501 }
    );
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "Missing or empty 'text' field" },
      { status: 400 }
    );
  }

  const truncated = text.slice(0, SARVAM_BULBUL_V2_MAX_CHARS);

  let upstream: Response;
  try {
    upstream = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": voiceKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: truncated,
        target_language_code: "en-IN",
        model: "bulbul:v2",
        // Omit `speaker` — Sarvam will use the model's default voice. The
        // operator can pin one later via an env-var or a future query param.
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network failure";
    return NextResponse.json(
      { error: `Could not reach Sarvam TTS: ${message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    // Normalize auth failures to 401 so the client's key-invalid mapping
    // catches every provider regardless of which status code they use.
    const isAuthError = upstream.status === 401 || upstream.status === 403;
    return NextResponse.json(
      {
        error: `Sarvam TTS returned ${upstream.status}: ${detail.slice(0, 400)}`,
      },
      { status: isAuthError ? 401 : upstream.status }
    );
  }

  let result: SarvamSynthesizeResponse;
  try {
    result = (await upstream.json()) as SarvamSynthesizeResponse;
  } catch {
    return NextResponse.json(
      { error: "Sarvam TTS returned an unparseable response" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    audios: result.audios ?? [],
    contentType: "audio/mpeg",
  });
}

interface SarvamSynthesizeResponse {
  request_id?: string | null;
  audios?: string[];
}
