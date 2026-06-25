import "server-only";
import {
  parseRinggTranscript,
  type TranscriptEntry,
} from "@/lib/screen/transcript";

// Server-side Ringg client for retrieving a completed call's transcript.
//
// Web calls in Ringg are launched client-side via the widget; the only
// server-side touchpoint is reading the result afterward. The browser hands us
// the callId (via the widget's `ringg:conversation_status` "ended" event); this
// fetches that call's details, including the transcript, from Ringg.
//
// GET /calling/call-details?id=<callId> — auth via the workspace key in the
// `X-API-KEY` header (NOT the browser-visible webcall public key). The
// transcript lives in the misnamed `transcription_url` field as a
// JSON-stringified array of {bot}/{user} turns; parseRinggTranscript handles it.

const RINGG_BASE = "https://prod-api.ringg.ai/ca/api/v0";

export class RinggApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "RinggApiError";
  }
}

export interface CallDetails {
  id: string;
  /** "completed" once Ringg finishes processing — gate scoring on this. */
  callStatus: string;
  /** "webcall" | "inbound" | "outbound". */
  callDirection: string;
  /** Parsed transcript turns (empty until processing completes). */
  entries: TranscriptEntry[];
  calleeName: string | null;
  /** The variables we injected, echoed back — used to correlate to a brief. */
  customArgs: Record<string, unknown>;
}

interface CallDetailsResponse {
  status?: string;
  data?: Record<string, unknown>;
}

/**
 * Fetch one call's details (incl. transcript) by call UUID.
 *
 * Throws RinggApiError on transport/HTTP failure. Note: the "ended" event fires
 * client-side BEFORE Ringg finishes processing, so a fresh callId may come back
 * with `callStatus !== "completed"` and an empty `entries` — callers should
 * treat that as "not ready yet" and poll again rather than as an error.
 */
export async function fetchCallDetails(
  callId: string,
  apiKey: string
): Promise<CallDetails> {
  const url = `${RINGG_BASE}/calling/call-details?id=${encodeURIComponent(
    callId
  )}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey },
      cache: "no-store",
    });
  } catch (err) {
    throw new RinggApiError(
      `Could not reach Ringg: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  if (!res.ok) {
    throw new RinggApiError(
      `Ringg call-details returned ${res.status}`,
      res.status
    );
  }

  let json: CallDetailsResponse;
  try {
    json = (await res.json()) as CallDetailsResponse;
  } catch {
    throw new RinggApiError("Ringg call-details returned non-JSON");
  }

  const data = json.data ?? {};
  return {
    id: typeof data.id === "string" ? data.id : callId,
    callStatus: typeof data.call_status === "string" ? data.call_status : "",
    callDirection:
      typeof data.call_direction === "string" ? data.call_direction : "",
    entries: parseRinggTranscript(data.transcription_url),
    calleeName: typeof data.callee_name === "string" ? data.callee_name : null,
    customArgs:
      data.custom_args_values && typeof data.custom_args_values === "object"
        ? (data.custom_args_values as Record<string, unknown>)
        : {},
  };
}
