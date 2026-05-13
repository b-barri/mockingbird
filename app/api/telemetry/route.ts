import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

// V1 telemetry sink: log to Vercel logs and return 204. No DB, no
// aggregation — operator greps logs to spot patterns. Full analytics is
// V2 work.

// Cap body size to keep an attacker from flooding Vercel logs with
// multi-MB JSON blobs that drown legit signal. Real events are ~200 bytes.
const MAX_TELEMETRY_BYTES = 4 * 1024;

export async function POST(request: Request): Promise<Response> {
  const rl = await rateLimit(request, "telemetry");
  if (!rl.ok) {
    // Telemetry is fire-and-forget on the client; a silent 429 is fine.
    return new Response(null, {
      status: 429,
      headers: { "retry-after": String(rl.retryAfter) },
    });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > MAX_TELEMETRY_BYTES) {
      return new Response(null, { status: 413 });
    }
  }

  try {
    const event = await request.json();
    // Console.log surfaces in Vercel runtime logs; structured JSON makes
    // it greppable.
    console.log(
      "telemetry",
      JSON.stringify({
        ts: new Date().toISOString(),
        ...event,
      })
    );
    return new Response(null, { status: 204 });
  } catch {
    // Don't echo parser internals — generic 400 is enough for the client.
    return NextResponse.json(
      { error: "Malformed telemetry payload" },
      { status: 400 }
    );
  }
}
