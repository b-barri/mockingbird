"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ThreePanel } from "@/components/session/three-panel";
import { getKey } from "@/lib/auth/key-storage";
import {
  getCaseById,
  pickRandomCase,
  type CaseTemplate,
} from "@/lib/llm/prompts/case-templates";
import {
  addLlmTokens,
  getCostSnapshot,
  resetCostTracker,
} from "@/lib/telemetry/cost-tracker";
import { saveCompletedSession } from "@/lib/voice/session-store";
import {
  initialSession,
  sessionReducer,
  turnsForContext,
  type SessionAction,
  type SessionSnapshot,
  type Turn,
} from "@/lib/voice/state-machine";

// V1 preview session route. Reads ?case=<id> from URL, looks up the case
// template, and seeds the session with the case prompt as the interviewer's
// opening turn. Listens for candidate text input, streams responses from
// /api/interview, and routes End Session to the summary page.
//
// Voice adapters ship after the V0 bakeoff (V1.1). Until then this route
// exercises every wire except the actual voice round-trip: LLM streaming,
// state-machine transitions, cost tracking, summary hand-off.

function buildOpeningSession(caseTemplate: CaseTemplate): SessionSnapshot {
  let s = sessionReducer(initialSession, {
    type: "START_SESSION",
    at: Date.now(),
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "ai-opening",
    speaker: "ai",
    text: caseTemplate.prompt,
    at: Date.now(),
  });
  s = sessionReducer(s, { type: "TRANSITION_LISTENING" });
  return s;
}

function SessionInner() {
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get("case") ?? "";
  const llmProvider = params.get("llm") ?? "anthropic";
  const voiceProvider = params.get("voice") ?? "cartesia";

  const caseTemplate = useMemo<CaseTemplate>(() => {
    const lookup = getCaseById(caseId);
    if (lookup) return lookup;
    if (caseId) {
      // eslint-disable-next-line no-console
      console.warn(
        `Unknown case id "${caseId}" — falling back to a random Product Design case.`
      );
    }
    return pickRandomCase();
  }, [caseId]);

  const [session, dispatch] = useReducer(
    sessionReducer,
    caseTemplate,
    buildOpeningSession
  );

  // Ref mirror — async callbacks need the latest turns/state without waiting
  // for the next render cycle. useReducer dispatches are queued, not sync.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const abortRef = useRef<AbortController | null>(null);
  const [llmKey, setLlmKey] = useState<string | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);

  // Load LLM key from storage on mount; redirect if absent.
  useEffect(() => {
    const stored = getKey("llm");
    if (!stored) {
      router.replace("/onboarding");
      return;
    }
    setLlmKey(stored);
    setKeyChecked(true);
  }, [router]);

  // Reset cost tracker per-session (R6c).
  useEffect(() => {
    resetCostTracker({ llmProvider, voiceProvider });
    // Per-session: deliberately mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort any in-flight stream on unmount so we don't leak fetches.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // currentQuestion = the latest non-stricken AI turn. Updates live as the
  // stream fills the turn via TRANSCRIPT_PARTIAL.
  const currentQuestion = useMemo(() => {
    for (let i = session.turns.length - 1; i >= 0; i--) {
      const t = session.turns[i];
      if (t.speaker === "ai" && !t.stricken) return t.text;
    }
    return caseTemplate.prompt;
  }, [session.turns, caseTemplate.prompt]);

  const handleSubmitTurn = useCallback(
    async (text: string) => {
      if (!llmKey) return;
      const userId = newTurnId("user");
      const aiId = newTurnId("ai");
      const now = Date.now();

      dispatch({
        type: "TRANSCRIPT_FINAL",
        id: userId,
        speaker: "user",
        text,
        at: now,
      });
      dispatch({ type: "TRANSITION_THINKING", listenEndAt: now });

      // The dispatched user turn hasn't reached sessionRef yet — append it
      // manually so the API sees the full conversation including this turn.
      const turnsForAPI: Turn[] = [
        ...turnsForContext(sessionRef.current),
        {
          id: userId,
          speaker: "user",
          text,
          partial: false,
          stricken: false,
          timestamp: now,
        },
      ];

      const controller = new AbortController();
      abortRef.current = controller;
      let firstChunk = true;
      let accumulated = "";

      try {
        const response = await fetch("/api/interview", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-llm-key": llmKey,
          },
          body: JSON.stringify({
            caseId: caseTemplate.id,
            turns: turnsForAPI,
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          dispatch({ type: "ERROR", kind: "key-invalid", at: Date.now() });
          return;
        }
        if (!response.ok || !response.body) {
          dispatch({
            type: "ERROR",
            kind: "provider-timeout",
            at: Date.now(),
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.replace(/^data:\s*/, "").trim();
            if (!data || data === "[DONE]") continue;
            let parsed: StreamEvent;
            try {
              parsed = JSON.parse(data) as StreamEvent;
            } catch {
              continue;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.usage) {
              addLlmTokens(
                parsed.usage.input_tokens ?? 0,
                parsed.usage.output_tokens ?? 0
              );
            }
            if (parsed.text) {
              if (firstChunk) {
                dispatch({
                  type: "TRANSITION_SPEAKING",
                  speechStartAt: Date.now(),
                });
                firstChunk = false;
              }
              accumulated += parsed.text;
              dispatch({
                type: "TRANSCRIPT_PARTIAL",
                id: aiId,
                speaker: "ai",
                text: accumulated,
                at: Date.now(),
              });
            }
          }
        }

        if (accumulated) {
          dispatch({
            type: "TRANSCRIPT_FINAL",
            id: aiId,
            speaker: "ai",
            text: accumulated,
            at: Date.now(),
          });
        }
        dispatch({ type: "TRANSITION_LISTENING" });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown error";
        // eslint-disable-next-line no-console
        console.error("Interview stream failed:", message);
        if (/401|unauthor|invalid.*key/i.test(message)) {
          dispatch({ type: "ERROR", kind: "key-invalid", at: Date.now() });
        } else if (/network|fetch|connection|offline/i.test(message)) {
          dispatch({ type: "ERROR", kind: "network-drop", at: Date.now() });
        } else {
          dispatch({
            type: "ERROR",
            kind: "provider-timeout",
            at: Date.now(),
          });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [llmKey, caseTemplate.id]
  );

  const handleEndSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const endedAt = Date.now();
    dispatch({ type: "END_SESSION", at: endedAt });

    const current = sessionRef.current;
    const id = saveCompletedSession({
      caseId: caseTemplate.id,
      turns: current.turns.filter((t) => !t.partial).map((t) => ({ ...t })),
      scratchpad: current.scratchpad,
      startedAt: current.startedAt ?? endedAt,
      endedAt,
      latencyMs: [...current.latencyMs],
      costSnapshot: getCostSnapshot(),
    });

    router.push(`/summary/${id}`);
  }, [caseTemplate.id, router]);

  const handleErrorAction = useCallback(() => {
    if (session.state.kind === "key-invalid") {
      router.push("/onboarding");
      return;
    }
    if (
      session.state.kind === "provider-timeout" ||
      session.state.kind === "network-drop" ||
      session.state.kind === "asr-no-result"
    ) {
      dispatch({ type: "TRANSITION_LISTENING" });
    }
  }, [session.state.kind, router]);

  if (!keyChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream text-sm text-mute">
        Loading session…
      </div>
    );
  }

  return (
    <ThreePanel
      session={session}
      dispatch={dispatch as (action: SessionAction) => void}
      caseTitle={caseTemplate.title}
      currentQuestion={currentQuestion}
      onEndSession={handleEndSession}
      onSubmitTurn={handleSubmitTurn}
      onErrorAction={handleErrorAction}
    />
  );
}

interface StreamEvent {
  text?: string;
  error?: string;
  telemetry?: string;
  matchedTrigger?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function newTurnId(prefix: "user" | "ai"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-cream text-sm text-mute">
          Loading session…
        </div>
      }
    >
      <SessionInner />
    </Suspense>
  );
}
