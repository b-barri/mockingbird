import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/voice/transcribe
//
// Body: multipart/form-data with `audio` file field
// Headers:
//   X-Voice-Key (required) — candidate's voice provider key, pass-through only
//   X-Voice-Provider (required) — currently only "sarvam"; Cartesia ships next
//
// Response: { transcript, language } on success, { error } on failure.
//
// The candidate's key is used in this single request only. No server-side
// storage; mirrors the BYO posture of /api/interview.

export async function POST(request: Request): Promise<Response> {
  const voiceKey = request.headers.get("x-voice-key");
  if (!voiceKey) {
    return NextResponse.json(
      { error: "Missing X-Voice-Key header" },
      { status: 401 }
    );
  }

  const provider = (request.headers.get("x-voice-provider") ?? "sarvam").toLowerCase();
  if (provider !== "sarvam") {
    return NextResponse.json(
      { error: `Voice provider "${provider}" is not yet implemented for transcription.` },
      { status: 501 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Malformed multipart body" },
      { status: 400 }
    );
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing or invalid 'audio' field" },
      { status: 400 }
    );
  }

  // Sarvam REST: https://api.sarvam.ai/speech-to-text
  // Auth: api-subscription-key header. Multipart with `file` (binary),
  // optional `model`, `language_code`. Default model saarika:v2.5.
  const sarvamForm = new FormData();
  sarvamForm.append("file", audio, "audio.webm");
  sarvamForm.append("model", "saarika:v2.5");
  sarvamForm.append("language_code", "en-IN");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": voiceKey },
      body: sarvamForm,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network failure";
    return NextResponse.json(
      { error: `Could not reach Sarvam STT: ${message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    // Normalize auth failures to 401 so the client's key-invalid mapping
    // catches every provider regardless of which status code they use
    // (Anthropic → 401, Sarvam → 403, etc).
    const isAuthError = upstream.status === 401 || upstream.status === 403;
    return NextResponse.json(
      { error: `Sarvam STT returned ${upstream.status}: ${detail.slice(0, 400)}` },
      { status: isAuthError ? 401 : upstream.status }
    );
  }

  let result: SarvamTranscribeResponse;
  try {
    result = (await upstream.json()) as SarvamTranscribeResponse;
  } catch {
    return NextResponse.json(
      { error: "Sarvam STT returned an unparseable response" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    transcript: result.transcript ?? "",
    language: result.language_code ?? null,
  });
}

interface SarvamTranscribeResponse {
  request_id?: string | null;
  transcript?: string;
  language_code?: string | null;
}
