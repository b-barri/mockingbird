"use client";

import { useReducer } from "react";
import { ThreePanel } from "@/components/session/three-panel";
import {
  initialSession,
  sessionReducer,
} from "@/lib/voice/state-machine";

// U4 ships the session route in "preview" mode — seeded with mock content
// matching mocks/v2-three-panel.html so the UI is testable end-to-end.
// U6 will wrap this page with the real provider + interviewer LLM wiring.
// V1 onboarding (U5) will navigate here with case + keys in URL/storage.

const SEED_SESSION = (() => {
  let s = sessionReducer(initialSession, {
    type: "START_SESSION",
    at: Date.now() - 22 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "ai-1",
    speaker: "ai",
    text: "Let's start with who exactly we're designing for, and what's the core problem they have today?",
    at: Date.now() - 21 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "user-1",
    speaker: "user",
    text: "I'd like to clarify first — are we targeting elderly who are meditation-curious, or trying to convert non-meditators?",
    at: Date.now() - 20 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "ai-2",
    speaker: "ai",
    text: "Good distinction. Let's say already curious — they've heard meditation helps with sleep and anxiety, but find existing apps overwhelming.",
    at: Date.now() - 19 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "user-2",
    speaker: "user",
    text: "Got it. We're designing for 65+ adults who know meditation can help but find apps like Calm or Headspace cluttered. Core problem I'd prioritize is decision fatigue.",
    at: Date.now() - 18 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "TRANSCRIPT_FINAL",
    id: "ai-3",
    speaker: "ai",
    text: "Hmm. Why decision fatigue specifically — not something about the audio content or accessibility?",
    at: Date.now() - 17 * 60 * 1000,
  });
  s = sessionReducer(s, {
    type: "SCRATCHPAD_UPDATE",
    text: `Clarifying questions
- Meditation-curious or non-meditators? → curious
- Why now? (sleep, anxiety triggers) → both

User
- 65+, smartphone-comfortable, not power-users
- aware meditation helps; intimidated by existing apps
- pain: cluttered UI, decision fatigue, small type

Solution sketch
- one-tap "today's session" on home — zero choices
- voice-guided onboarding (not text walls)
- large type, high contrast, single CTA`,
  });
  // Place the session in "listening" right after AI just asked the latest probe.
  s = sessionReducer(s, { type: "TRANSITION_LISTENING" });
  return s;
})();

export default function SessionPage() {
  const [session, dispatch] = useReducer(sessionReducer, SEED_SESSION);

  return (
    <ThreePanel
      session={session}
      dispatch={dispatch}
      caseTitle="Design a meditation app for elderly users"
      currentQuestion="Why decision fatigue specifically — not audio content or accessibility?"
    />
  );
}
