"use client";

import { useCallback, useEffect, useState } from "react";
import { getKey } from "@/lib/auth/key-storage";
import { briefToRinggVariables } from "@/lib/screen/ringg-variables";
import type { Brief } from "@/lib/screen/brief";
import type { StructuredFeedback, DimensionVerdict } from "@/lib/llm/summary";

// U6/U7: the browser side of the screening web call.
//
// Loads the Ringg (DesiVocal) widget — mirroring the dashboard's exact loader —
// and calls loadAgent with the brief's variables plus a `session_id` for
// correlation. When the widget fires `ringg:conversation_status` with
// status "ended", it captures the callId and polls /api/screen/result until the
// transcript is processed and scored. No webhook: the callId arrives
// client-side. Server half: lib/ringg/call-details.ts + lib/screen/score.ts.

const CDN_VERSION = "1.0.22-alpha.1"; // from the Ringg dashboard embed snippet
const AGENT_ID = process.env.NEXT_PUBLIC_RINGG_AGENT_ID;
const WEBCALL_KEY = process.env.NEXT_PUBLIC_RINGG_WEBCALL_KEY;

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 12; // ~36s of transcript-processing headroom

interface ConversationStatusDetail {
  status: "started" | "ended";
  mode?: string;
  callId?: string;
}

interface LoadAgentOptions {
  agentId: string;
  authorization: string;
  variables: Record<string, string>;
  defaultTab?: "audio" | "text";
}

declare global {
  interface Window {
    loadAgent?: (opts: LoadAgentOptions) => void;
  }
}

/**
 * Port of Ringg's dashboard loader: inject style.css + dv-agent.es.js, resolve
 * once the bundle (which sets window.loadAgent) has loaded. Idempotent — safe to
 * call more than once; the script/link are injected at most once.
 */
function loadAgentsCdn(version: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.loadAgent) return resolve();
    const base = `https://cdn.jsdelivr.net/npm/@desivocal/agents-cdn@${version}/dist`;

    if (!document.querySelector("link[data-dv-agent-css]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = `${base}/style.css`;
      link.dataset.dvAgentCss = "true";
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-dv-agent]"
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Ringg SDK failed to load"))
      );
      return;
    }

    const s = document.createElement("script");
    s.type = "text/javascript";
    s.src = `${base}/dv-agent.es.js`;
    s.dataset.dvAgent = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Ringg SDK failed to load"));
    document.head.appendChild(s);
  });
}

type Phase =
  | "idle"
  | "starting"
  | "live"
  | "scoring"
  | "scored"
  | "unscorable"
  | "error";

const VERDICT_STYLE: Record<DimensionVerdict, string> = {
  strong: "border-ink/30 bg-ink/5 text-ink",
  developing: "border-mute/40 bg-cream text-mute",
  missing: "border-coral/40 bg-coral/5 text-coral",
};

export function ScreenCall({ brief }: { brief: Brief }) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<StructuredFeedback | null>(null);

  const configured = Boolean(AGENT_ID && WEBCALL_KEY);

  // Fetch + score the finished call, polling while Ringg is still processing
  // (the "ended" event fires before the transcript is ready).
  const scoreFromCall = useCallback(
    async (callId: string) => {
      const llmKey = getKey("llm");
      if (!llmKey) {
        setError(
          "Your Anthropic key isn't in this tab — rebuild the brief to re-enter it."
        );
        setPhase("error");
        return;
      }
      setPhase("scoring");

      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        let res: Response;
        try {
          res = await fetch("/api/screen/result", {
            method: "POST",
            headers: { "content-type": "application/json", "x-llm-key": llmKey },
            body: JSON.stringify({ callId, brief }),
          });
        } catch (err) {
          setError(
            `Could not reach the scoring service: ${
              err instanceof Error ? err.message : "unknown"
            }`
          );
          setPhase("error");
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          status?: string;
          feedback?: StructuredFeedback;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? `Scoring failed (${res.status}).`);
          setPhase("error");
          return;
        }
        if (data.status === "scored" && data.feedback) {
          setFeedback(data.feedback);
          setPhase("scored");
          return;
        }
        if (data.status === "unscorable") {
          setPhase("unscorable");
          return;
        }
        // status === "pending": transcript still processing — wait and retry.
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      setError(
        "The transcript is taking longer than expected to process. Give it a moment, then retry."
      );
      setPhase("error");
    },
    [brief]
  );

  // Subscribe to the widget's lifecycle events (DOM events on window).
  useEffect(() => {
    function onStatus(e: Event) {
      const detail = (e as CustomEvent<ConversationStatusDetail>).detail;
      if (!detail) return;
      if (detail.status === "started") {
        setPhase("live");
      } else if (detail.status === "ended" && detail.callId) {
        void scoreFromCall(detail.callId);
      }
    }
    window.addEventListener("ringg:conversation_status", onStatus);
    return () =>
      window.removeEventListener("ringg:conversation_status", onStatus);
  }, [scoreFromCall]);

  async function handleStart() {
    if (!configured) return;
    setError(null);
    setPhase("starting");
    try {
      await loadAgentsCdn(CDN_VERSION);
      if (!window.loadAgent) {
        throw new Error("Ringg SDK loaded but loadAgent is unavailable.");
      }
      window.loadAgent({
        agentId: AGENT_ID as string,
        authorization: `Bearer ${WEBCALL_KEY as string}`,
        variables: {
          ...briefToRinggVariables(brief, name),
          session_id: brief.id, // echoed back in custom_args_values for correlation
        },
        defaultTab: "audio",
      });
      // The widget now shows its own launcher (bottom-right). The call begins
      // when the user clicks it; the "started" event flips us to "live".
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the call.");
      setPhase("error");
    }
  }

  if (!configured) {
    return (
      <section className="pf-panel space-y-2 p-4 sm:p-6">
        <div className="ascii-rule mb-1">── MOCK_SCREEN ───────────────────────────────────</div>
        <p className="font-mono text-[12px] text-mute">
          // the live mock screen needs NEXT_PUBLIC_RINGG_WEBCALL_KEY and
          NEXT_PUBLIC_RINGG_AGENT_ID set. Not configured in this environment.
        </p>
      </section>
    );
  }

  return (
    <section className="pf-panel space-y-4 p-4 sm:p-6" data-testid="screen-call">
      <div className="ascii-rule mb-1">── MOCK_SCREEN ───────────────────────────────────</div>
      <p className="font-mono text-[12px] text-mute">
        // a real voice screen with {brief.company}&apos;s interviewer, tailored
        to this brief. you&apos;ll get scored feedback right after.
      </p>

      {(phase === "idle" || phase === "starting") && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="callee-name"
              className="block font-mono text-[12px] text-ink"
            >
              Your name <span className="ml-2 text-mute">[optional]</span>
            </label>
            <input
              id="callee-name"
              type="text"
              value={name}
              placeholder="so Riya can greet you"
              onChange={(e) => setName(e.target.value)}
              disabled={phase === "starting"}
              className="mt-1 w-full rounded-[3px] border border-ink/20 bg-cream px-3 py-2 font-mono text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleStart}
            disabled={phase === "starting"}
            className="w-full rounded-[3px] bg-ink px-5 py-3.5 text-left font-mono text-[13px] font-medium text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="mr-2 text-coral">▸</span>
            {phase === "starting"
              ? "Loading the interviewer…"
              : "Start my mock screen"}
          </button>
          {phase === "starting" && (
            <p
              role="status"
              className="font-mono text-[11px] text-mute"
            >
              // launcher loading — click the Riya button (bottom-right) to begin
              the call.
            </p>
          )}
        </div>
      )}

      {phase === "live" && (
        <p role="status" className="font-mono text-[13px] text-ink">
          <span className="mr-2 text-coral">●</span> call in progress… answer
          Riya out loud. feedback comes right after you hang up.
        </p>
      )}

      {phase === "scoring" && (
        <p role="status" className="font-mono text-[13px] text-mute">
          // scoring your screen against the brief… this can take a few seconds.
        </p>
      )}

      {phase === "unscorable" && (
        <p role="status" className="font-mono text-[13px] text-ink">
          // no candidate speech was captured, so there&apos;s nothing to score.
          check your mic and try the screen again.
        </p>
      )}

      {phase === "error" && error && (
        <div className="space-y-3">
          <p
            role="alert"
            className="rounded-[3px] border border-coral/40 bg-coral/5 px-3 py-2 font-mono text-[12px] text-coral"
          >
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setError(null);
            }}
            className="rounded-[3px] border border-ink/20 px-4 py-2 font-mono text-[12px] text-ink hover:bg-ink/5"
          >
            <span className="mr-2 text-coral">▸</span> Try again
          </button>
        </div>
      )}

      {phase === "scored" && feedback && <FeedbackView feedback={feedback} />}
    </section>
  );
}

function FeedbackView({ feedback }: { feedback: StructuredFeedback }) {
  return (
    <div className="space-y-5" data-testid="screen-feedback">
      <div className="ascii-rule">── HOW_IT_WENT ───────────────────────────────────</div>

      <ul className="space-y-2">
        {feedback.dimensions.map((d) => (
          <li
            key={d.name}
            className="flex items-start gap-3 font-mono text-[13px]"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-[3px] border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                VERDICT_STYLE[d.verdict]
              }`}
            >
              {d.verdict}
            </span>
            <span className="text-ink">
              <span className="font-medium">{d.name}</span> — {d.observation}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="ascii-rule">── WHAT_WORKED ───────────────────────────────────</div>
        <p className="font-mono text-[13px] leading-relaxed text-ink">
          {feedback.whatWorked}
        </p>
      </div>

      <div className="space-y-2">
        <div className="ascii-rule">── WHAT_TO_FIX ───────────────────────────────────</div>
        <p className="font-mono text-[13px] leading-relaxed text-ink">
          {feedback.whatMissed}
        </p>
      </div>
    </div>
  );
}
