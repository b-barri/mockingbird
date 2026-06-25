import "server-only";
import { assertSafeFetchUrl, SsrfError } from "@/lib/research/ssrf";

// Source gathering for the research engine.
//
// V1 scope: fetch the candidate-supplied company URL (SSRF-guarded, time-boxed)
// and extract readable text. Web search across Glassdoor/Reddit/YouTube is a
// best-effort future enhancement (origin: deferred to implementation) — this
// keeps the engine dependency-free and shippable. Every fetch is independently
// time-boxed so one slow/blocked source can't stall brief generation.

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS = 12_000;

export interface SourceResult {
  readonly kind: "company-site";
  readonly ok: boolean;
  readonly url?: string;
  readonly text?: string;
  readonly error?: string;
}

/** Strip tags/scripts/styles and collapse whitespace into readable text. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, MAX_TEXT_CHARS);
}

/**
 * Fetch and extract the company page. Never throws — returns a SourceResult
 * with ok:false on any failure (SSRF reject, timeout, non-2xx, network error)
 * so the orchestrator can degrade gracefully.
 */
export async function fetchCompanySite(
  rawUrl: string
): Promise<SourceResult> {
  let safeUrl: string;
  try {
    safeUrl = await assertSafeFetchUrl(rawUrl);
  } catch (err) {
    return {
      kind: "company-site",
      ok: false,
      error:
        err instanceof SsrfError
          ? err.message
          : `URL validation failed: ${
              err instanceof Error ? err.message : "unknown"
            }`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(safeUrl, {
      signal: controller.signal,
      redirect: "error", // don't follow redirects — they bypass the SSRF check
      headers: { "user-agent": "mockingbird-research/1.0" },
    });
    if (!res.ok) {
      return {
        kind: "company-site",
        ok: false,
        url: safeUrl,
        error: `Site returned HTTP ${res.status}.`,
      };
    }
    const html = await res.text();
    return {
      kind: "company-site",
      ok: true,
      url: safeUrl,
      text: htmlToText(html),
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      kind: "company-site",
      ok: false,
      url: safeUrl,
      error: aborted ? "Site fetch timed out." : "Could not reach the site.",
    };
  } finally {
    clearTimeout(timer);
  }
}
