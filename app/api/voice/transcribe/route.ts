import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/voice/transcribe
//
// Body: multipart/form-data with `audio` file field
// Headers:
//   X-Voice-Key (required) — candidate's voice provider key, pass-through only
//   X-Voice-Provider (required) — "sarvam" or "cartesia"
//
// Response: { transcript, language } on success, { error } on failure.
//
// The candidate's key is used in this single request only. No server-side
// storage; mirrors the BYO posture of /api/interview.

const CARTESIA_VERSION = "2025-04-16";

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
  if (provider !== "sarvam" && provider !== "cartesia") {
    return NextResponse.json(
      {
        error: `Voice provider "${provider}" is not yet implemented for transcription.`,
      },
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

  // MediaRecorder produces blobs typed "audio/webm;codecs=opus" — Sarvam
  // rejects the codec parameter, and Cartesia is happier with plain MIME
  // types too. Re-wrap so the type string is just "audio/webm".
  const audioBuffer = await audio.arrayBuffer();
  const sanitizedType = (audio.type.split(";")[0] || "audio/webm").trim();
  const sanitizedBlob = new Blob([audioBuffer], { type: sanitizedType });

  if (provider === "sarvam") {
    return transcribeViaSarvam(voiceKey, sanitizedBlob, audio);
  }
  return transcribeViaCartesia(voiceKey, sanitizedBlob, audio);
}

async function transcribeViaSarvam(
  voiceKey: string,
  sanitizedBlob: Blob,
  originalAudio: Blob
): Promise<Response> {
  // Sarvam REST: https://api.sarvam.ai/speech-to-text
  // Auth: api-subscription-key header. saaras:v3 is recommended; mode=transcribe
  // keeps output in the candidate's spoken language rather than translating.
  const sarvamForm = new FormData();
  sarvamForm.append("file", sanitizedBlob, "audio.webm");
  sarvamForm.append("model", "saaras:v3");
  sarvamForm.append("language_code", "en-IN");
  sarvamForm.append("mode", "transcribe");

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
    // eslint-disable-next-line no-console
    console.error(
      `[voice/transcribe] Sarvam STT ${upstream.status}:`,
      detail.slice(0, 1000),
      `(audio blob ${originalAudio.size} bytes, type ${originalAudio.type})`
    );
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

async function transcribeViaCartesia(
  voiceKey: string,
  sanitizedBlob: Blob,
  originalAudio: Blob
): Promise<Response> {
  // Cartesia REST: https://api.cartesia.ai/stt
  // Auth: Bearer + Cartesia-Version header (required). ink-whisper is the
  // current model. language=en is the default; explicit for clarity.
  const cartesiaForm = new FormData();
  cartesiaForm.append("file", sanitizedBlob, "audio.webm");
  cartesiaForm.append("model", "ink-whisper");
  cartesiaForm.append("language", "en");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.cartesia.ai/stt", {
      method: "POST",
      headers: {
        authorization: `Bearer ${voiceKey}`,
        "cartesia-version": CARTESIA_VERSION,
      },
      body: cartesiaForm,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network failure";
    return NextResponse.json(
      { error: `Could not reach Cartesia STT: ${message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(
      `[voice/transcribe] Cartesia STT ${upstream.status}:`,
      detail.slice(0, 1000),
      `(audio blob ${originalAudio.size} bytes, type ${originalAudio.type})`
    );
    const isAuthError = upstream.status === 401 || upstream.status === 403;
    return NextResponse.json(
      {
        error: `Cartesia STT returned ${upstream.status}: ${detail.slice(0, 400)}`,
      },
      { status: isAuthError ? 401 : upstream.status }
    );
  }

  let result: CartesiaTranscribeResponse;
  try {
    result = (await upstream.json()) as CartesiaTranscribeResponse;
  } catch {
    return NextResponse.json(
      { error: "Cartesia STT returned an unparseable response" },
      { status: 502 }
    );
  }

  // Cartesia uses `text` for the transcription field (vs Sarvam's
  // `transcript`); normalize so the client receives the same shape.
  return NextResponse.json({
    transcript: result.text ?? "",
    language: result.language ?? null,
  });
}

interface SarvamTranscribeResponse {
  request_id?: string | null;
  transcript?: string;
  language_code?: string | null;
}

interface CartesiaTranscribeResponse {
  text?: string;
  language?: string | null;
  duration?: number | null;
  words?: Array<{ word: string; start: number; end: number }>;
}
