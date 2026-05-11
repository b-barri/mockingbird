import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/voice/synthesize
//
// Body: JSON { text }
// Headers:
//   X-Voice-Key (required) — candidate's voice provider key, pass-through only
//   X-Voice-Provider (required) — "sarvam" or "cartesia"
//
// Response: { audios: string[], contentType, sampleRate }
//   audios are base64-encoded audio chunks. Sarvam natively returns multiple
//   chunks for long text; Cartesia returns one binary blob per request that we
//   base64-encode to keep the response shape identical. The client plays them
//   sequentially via useAudioPlayer.
//
// Format choice: both providers asked for `wav` (16-bit linear PCM with a WAV
// header) so HTMLAudioElement decodes natively. The candidate doesn't see the
// difference between providers other than the voice itself.

const SARVAM_BULBUL_V2_MAX_CHARS = 1500;
const SARVAM_DEFAULT_SPEAKER = "anushka"; // bulbul:v2 default — female Indian-English voice
const SARVAM_OUTPUT_SAMPLE_RATE = 22050;

const CARTESIA_VERSION = "2025-04-16";
const CARTESIA_DEFAULT_MODEL = "sonic-2"; // stable; sonic-3 is newer but pricier
const CARTESIA_DEFAULT_VOICE_ID = "228fca29-3a0a-435c-8728-5cb483251068"; // Kiefer — male, voice-agent style
const CARTESIA_OUTPUT_SAMPLE_RATE = 24000;
// Bulbul's 1500-char cap is the tighter of the two; share it so swapping
// providers mid-session doesn't surface different truncation behavior.
const TTS_MAX_CHARS = SARVAM_BULBUL_V2_MAX_CHARS;

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

  const truncated = text.slice(0, TTS_MAX_CHARS);

  if (provider === "sarvam") {
    return synthesizeViaSarvam(voiceKey, truncated);
  }
  return synthesizeViaCartesia(voiceKey, truncated);
}

async function synthesizeViaSarvam(
  voiceKey: string,
  truncated: string
): Promise<Response> {
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
        speaker: SARVAM_DEFAULT_SPEAKER,
        // Ask for `wav` not `linear16` — same 16-bit PCM bytes, but `wav`
        // adds the RIFF header HTMLAudioElement needs to decode natively.
        output_audio_codec: "wav",
        speech_sample_rate: SARVAM_OUTPUT_SAMPLE_RATE,
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
    contentType: "audio/wav",
    sampleRate: SARVAM_OUTPUT_SAMPLE_RATE,
  });
}

async function synthesizeViaCartesia(
  voiceKey: string,
  truncated: string
): Promise<Response> {
  // Cartesia bytes endpoint: single POST → raw audio bytes. We base64-encode
  // them server-side so the response shape matches Sarvam's chunked array
  // — keeps the audio player provider-agnostic.
  let upstream: Response;
  try {
    upstream = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        authorization: `Bearer ${voiceKey}`,
        "cartesia-version": CARTESIA_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_DEFAULT_MODEL,
        transcript: truncated,
        voice: { mode: "id", id: CARTESIA_DEFAULT_VOICE_ID },
        // wav so HTMLAudioElement can decode natively, same as Sarvam path.
        output_format: {
          container: "wav",
          encoding: "pcm_s16le",
          sample_rate: CARTESIA_OUTPUT_SAMPLE_RATE,
        },
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network failure";
    return NextResponse.json(
      { error: `Could not reach Cartesia TTS: ${message}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(
      `[voice/synthesize] Cartesia TTS ${upstream.status}:`,
      detail.slice(0, 1000)
    );
    const isAuthError = upstream.status === 401 || upstream.status === 403;
    return NextResponse.json(
      {
        error: `Cartesia TTS returned ${upstream.status}: ${detail.slice(0, 400)}`,
      },
      { status: isAuthError ? 401 : upstream.status }
    );
  }

  const audioBuffer = await upstream.arrayBuffer();
  const base64 = arrayBufferToBase64(audioBuffer);

  return NextResponse.json({
    audios: [base64],
    contentType: "audio/wav",
    sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE,
  });
}

/**
 * Edge-runtime safe binary → base64 conversion. btoa() needs a binary string,
 * which String.fromCharCode produces — but we must chunk to avoid blowing
 * the JS engine's apply() argument limit on large audio (>1MB).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const CHUNK_SIZE = 0x8000; // 32K — well under v8's argument cap
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, Array.from(slice)));
  }
  return btoa(chunks.join(""));
}

interface SarvamSynthesizeResponse {
  request_id?: string | null;
  audios?: string[];
}
