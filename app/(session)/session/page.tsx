"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useReducer } from "react";
import { ThreePanel } from "@/components/session/three-panel";
import {
  getCaseById,
  pickRandomCase,
  type CaseTemplate,
} from "@/lib/llm/prompts/case-templates";
import {
  initialSession,
  sessionReducer,
  type SessionAction,
  type SessionSnapshot,
} from "@/lib/voice/state-machine";

// V1 preview session route. Reads ?case=<id> from URL, looks up the case
// template, and seeds the session with the case prompt as the interviewer's
// opening turn — then sits in `listening` waiting for the candidate.
//
// Live voice + LLM streaming wiring lands in a follow-up phase. For now the
// session is interactive enough to validate the panel layout, the case
// hand-off from /onboarding/case-select, and the state-machine transitions.
//
// Falls back to a random case if `case` is missing or unknown so the route
// is direct-link-previewable without first running the onboarding flow.

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
  // Interviewer just delivered the case — candidate's turn.
  s = sessionReducer(s, { type: "TRANSITION_LISTENING" });
  return s;
}

function SessionInner() {
  const params = useSearchParams();
  const caseId = params.get("case") ?? "";

  const caseTemplate = useMemo<CaseTemplate>(() => {
    const lookup = getCaseById(caseId);
    if (lookup) return lookup;
    // Direct-link or stale id: hand a random case so the page is still useful.
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

  return (
    <ThreePanel
      session={session}
      dispatch={dispatch as (action: SessionAction) => void}
      caseTitle={caseTemplate.title}
      currentQuestion={caseTemplate.prompt}
    />
  );
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
