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
//
// Design system (docs/design/mockingbird-design-system.md): three voices, surfaces
// + hairlines (no shadows), rationed coral, "your interviewer" (no invented name).

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

/**
 * Remove the Ringg launcher the SDK appends to <body>. The widget mounts a
 * single root element (#ringg_ai_container, the id every one of its CSS rules is
 * scoped to) directly on the body — outside React's tree — and never tears it
 * down. Without this, the floating call button lingers on every page after the
 * user navigates away from the screen. Safe to call when it isn't present.
 */
function teardownRinggWidget() {
  document.getElementById("ringg_ai_container")?.remove();
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
  strong: "border-white/20 bg-white/[0.06] text-ink",
  developing: "border-white/12 text-mute",
  missing: "border-coral/40 bg-coral/10 text-coral",
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
          "Your Anthropic key isn't in this tab. Rebuild the brief to re-enter it."
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

  // Tear down the body-level launcher when we leave the screen page, so it
  // doesn't follow the user onto the homepage and other routes.
  useEffect(() => teardownRinggWidget, []);

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
        <div className="ascii-rule mb-2">Mock screen</div>
        <p className="text-[13px] leading-relaxed text-ink-2">
          The live mock screen needs <code className="text-ink">NEXT_PUBLIC_RINGG_WEBCALL_KEY</code>{" "}
          and <code className="text-ink">NEXT_PUBLIC_RINGG_AGENT_ID</code> set. They
          aren&apos;t configured in this environment.
        </p>
      </section>
    );
  }

  return (
    <section className="pf-panel space-y-4 p-4 sm:p-6" data-testid="screen-call">
      <div className="ascii-rule mb-3">Mock screen</div>

      {(phase === "idle" || phase === "starting") && (
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-ink-2">
            A live voice screen with {brief.company}&apos;s interviewer, tailored to
            this brief. You&apos;ll get scored feedback the moment you hang up.
          </p>
          <div>
            <label
              htmlFor="callee-name"
              className="block text-[13px] font-medium text-ink"
            >
              Your name <span className="ml-1 font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="callee-name"
              type="text"
              value={name}
              placeholder="so your interviewer can greet you"
              onChange={(e) => setName(e.target.value)}
              disabled={phase === "starting"}
              className="pf-field mt-1.5 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={phase === "starting"}
              className="pf-exec-btn disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "starting"
                ? "Loading the interviewer…"
                : "Start my screen"}
              {phase === "idle" && <span className="kbd ml-1">↵</span>}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mute">
              Live voice by <span className="text-coral">Ringg AI</span>
            </span>
          </div>
          {phase === "starting" && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-[8px] border border-coral/30 bg-coral/[0.08] px-3 py-3"
            >
              <span className="mt-0.5 shrink-0 text-coral" aria-hidden>
                ↘
              </span>
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-ink">
                  One more step
                </p>
                <p className="text-[14px] leading-relaxed text-ink-2">
                  Your interviewer is ready. Click the round phone button in the
                  bottom-right corner to start talking.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coaching pointer anchored at the Ringg launcher (fixed bottom-right).
          Bridges the spatial gap between this panel and the widget's own call
          button — the step users otherwise miss. Shown only while we wait for
          them to click it; pointer-events-none so it never blocks the launcher. */}
      {phase === "starting" && (
        <div
          className="pointer-events-none fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-1.5 sm:right-6"
          aria-hidden
        >
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-coral/40 bg-coral px-3 py-2 text-[12px] font-semibold text-white shadow-lg">
            Click to start
          </span>
          <span className="mr-4 animate-bounce text-2xl leading-none text-coral">
            ↓
          </span>
        </div>
      )}

      {phase === "live" && (
        <div className="py-4 text-center" role="status">
          <div className="relative mx-auto h-28 w-28">
            <span className="absolute inset-0 rounded-full border border-coral/50 animate-ring-expand" />
            <span
              className="absolute inset-0 rounded-full animate-orb-pulse"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, #f0815f, #E85D3B 55%, #c43e22)",
                boxShadow: "0 0 44px rgba(232,93,59,.4)",
              }}
            />
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-coral">
            <span className="pulse-dot align-middle" /> Screen live
          </p>
          <p className="mt-3 text-[14px] text-ink">
            Answer your interviewer out loud.
          </p>
          <p className="mt-1 text-[13px] text-mute">
            Feedback comes the moment you hang up.
          </p>
          <p className="mt-4 inline-block rounded-[8px] border border-white/12 bg-white/[0.02] px-3 py-2 text-[12px] text-mute">
            Mic and end-call live in Ringg&apos;s panel ↘
          </p>
        </div>
      )}

      {phase === "scoring" && (
        <div role="status" className="space-y-2">
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
            <span className="text-coral">✓</span> Transcript captured
          </p>
          <p className="text-[14px] text-ink-2">
            Scoring against your brief&apos;s dimensions
            <span className="animate-caret-blink">…</span>
          </p>
          <p className="text-[13px] text-mute">
            The transcript lags the hang-up by a few seconds. Hang tight.
          </p>
        </div>
      )}

      {phase === "unscorable" && (
        <p role="status" className="text-[14px] leading-relaxed text-ink">
          No candidate speech was captured, so there&apos;s nothing to score. Check
          your mic and try the screen again.
        </p>
      )}

      {phase === "error" && error && (
        <div className="space-y-3">
          <p
            role="alert"
            className="rounded-[8px] border border-coral/40 bg-coral/10 px-3 py-2 text-[13px] text-coral"
          >
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setError(null);
            }}
            className="pf-btn-ghost"
          >
            Try again
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
      <div className="ascii-rule">How it went</div>

      <ul className="space-y-3">
        {feedback.dimensions.map((d) => (
          <li
            key={d.name}
            className="grid grid-cols-[88px_1fr] items-start gap-3"
          >
            <span
              className={`shrink-0 rounded-[6px] border px-2 py-0.5 text-center text-[10px] font-medium uppercase tracking-wide ${
                VERDICT_STYLE[d.verdict]
              }`}
            >
              {d.verdict}
            </span>
            <span className="text-[14px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{d.name}.</span>{" "}
              {d.observation}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="ascii-rule">What worked</div>
        <p className="text-[14px] leading-relaxed text-ink-2">{feedback.whatWorked}</p>
      </div>

      <div className="space-y-2">
        <div className="ascii-rule">What to fix</div>
        <p className="text-[14px] leading-relaxed text-ink-2">{feedback.whatMissed}</p>
      </div>
    </div>
  );
}
