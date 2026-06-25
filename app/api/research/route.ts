import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/research";
import { rateLimit } from "@/lib/rate-limit";

// Node runtime, NOT edge: research fans out to an external site fetch plus a
// buffered (non-streaming) Anthropic synthesis. That serial work can exceed the
// Edge initial-response window and return a truncated/failed brief; Node gives
// the headroom. The SSRF guard in lib/research/ssrf also needs node:dns.
export const runtime = "nodejs";

interface ResearchRequest {
  company?: string;
  role?: string;
  jobDescription?: string;
  companyUrl?: string;
}

// POST /api/research
// Header: X-LLM-Key (pass-through, never stored)
// Body:   { company, role, jobDescription, companyUrl? }
// Response: application/json — Brief or { error }
export async function POST(request: Request): Promise<Response> {
  const rl = await rateLimit(request, "research");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${rl.retryAfter}s.` },
      {
        status: 429,
        headers: {
          "retry-after": String(rl.retryAfter),
          "x-ratelimit-limit": String(rl.limit),
          "x-ratelimit-remaining": "0",
        },
      }
    );
  }

  const apiKey = request.headers.get("x-llm-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-LLM-Key header" },
      { status: 401 }
    );
  }

  let body: ResearchRequest;
  try {
    body = (await request.json()) as ResearchRequest;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const company = body.company?.trim() ?? "";
  const role = body.role?.trim() ?? "";
  const jobDescription = body.jobDescription?.trim() ?? "";
  if (!company || !role || !jobDescription) {
    return NextResponse.json(
      { error: "company, role, and jobDescription are required." },
      { status: 400 }
    );
  }

  try {
    const brief = await generateBrief({
      company,
      role,
      jobDescription,
      companyUrl: body.companyUrl?.trim() || undefined,
      apiKey,
    });
    return NextResponse.json(brief);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Research failed: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
      { status: 502 }
    );
  }
}
