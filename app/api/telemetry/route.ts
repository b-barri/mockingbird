import { NextResponse } from "next/server";

export const runtime = "edge";

// V1 telemetry sink: log to Vercel logs and return 204. No DB, no
// aggregation — operator greps logs to spot patterns. Full analytics is
// V2 work.

export async function POST(request: Request): Promise<Response> {
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
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Malformed telemetry payload",
      },
      { status: 400 }
    );
  }
}
