"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  initialSession,
  sessionReducer,
  type SessionAction,
  type SessionSnapshot,
} from "./state-machine";
import type { VoiceEvent, VoiceProvider } from "./types";

// React hook bridging a VoiceProvider's event stream to the session reducer.
// Side effects live here (subscription, telemetry callbacks, provider-timeout
// timer); the reducer itself stays pure.

const PROVIDER_TIMEOUT_MS = 8_000;

export interface UseVoiceSessionOptions {
  provider: VoiceProvider;
  /** Telemetry callback fired on each latency measurement (R9b feeds U9). */
  onLatency?: (latencyMs: number) => void;
  /** Telemetry callback for ASR confidence on each final turn (U9). */
  onAsrConfidence?: (speaker: "user" | "ai", confidence: number) => void;
}

export interface UseVoiceSessionResult {
  session: SessionSnapshot;
  dispatch: (action: SessionAction) => void;
  /** Start a session — handler that wires up provider subscription. */
  start: (at?: number) => void;
  /** End the active session. */
  end: (at?: number) => void;
}

export function useVoiceSession(
  options: UseVoiceSessionOptions
): UseVoiceSessionResult {
  const { provider, onLatency, onAsrConfidence } = options;
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to provider events while a session is active.
  useEffect(() => {
    if (session.state.kind === "idle") return;
    const unsubscribe = provider.on((event: VoiceEvent) => {
      handleProviderEvent(event, dispatch);
    });
    return unsubscribe;
  }, [provider, session.state.kind]);

  // Provider-timeout watchdog: while in "thinking", arm an 8s timer that
  // transitions to the provider-timeout error state if no speech-start
  // event arrives. R9a includes provider-timeout with a retry affordance.
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (session.state.kind === "thinking") {
      timeoutRef.current = setTimeout(() => {
        dispatch({
          type: "ERROR",
          kind: "provider-timeout",
          at: Date.now(),
        });
      }, PROVIDER_TIMEOUT_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [session.state.kind]);

  // Emit telemetry when a latency measurement lands.
  useEffect(() => {
    if (session.latencyMs.length === 0) return;
    const latest = session.latencyMs[session.latencyMs.length - 1];
    if (onLatency) onLatency(latest);
  }, [session.latencyMs.length, onLatency]);

  // Emit ASR confidence telemetry on final turns.
  useEffect(() => {
    const lastFinal = [...session.turns].reverse().find((t) => !t.partial);
    if (lastFinal && lastFinal.confidence !== undefined && onAsrConfidence) {
      onAsrConfidence(lastFinal.speaker, lastFinal.confidence);
    }
    // Intentionally only key on turns array — the callback handler de-dupes
    // upstream if needed.
  }, [session.turns.length, onAsrConfidence]);

  const start = useCallback((at: number = Date.now()) => {
    dispatch({ type: "START_SESSION", at });
  }, []);

  const end = useCallback((at: number = Date.now()) => {
    dispatch({ type: "END_SESSION", at });
  }, []);

  return { session, dispatch, start, end };
}

/** Map a single provider event to the corresponding reducer action(s). */
function handleProviderEvent(
  event: VoiceEvent,
  dispatch: (action: SessionAction) => void
): void {
  switch (event.type) {
    case "transcript-partial":
      dispatch({
        type: "TRANSCRIPT_PARTIAL",
        id: `${event.speaker}-partial`,
        speaker: event.speaker,
        text: event.text,
        confidence: event.confidence,
        at: Date.now(),
      });
      break;

    case "transcript-final":
      dispatch({
        type: "TRANSCRIPT_FINAL",
        id: `${event.speaker}-${Date.now()}`,
        speaker: event.speaker,
        text: event.text,
        confidence: event.confidence,
        at: Date.now(),
      });
      break;

    case "speech-end":
      if (event.speaker === "user") {
        // User stopped speaking → AI is now thinking. Mark listen-end.
        dispatch({
          type: "TRANSITION_THINKING",
          listenEndAt: event.at,
        });
      } else {
        // AI finished speaking → back to listening.
        dispatch({ type: "TRANSITION_LISTENING" });
      }
      break;

    case "speech-start":
      if (event.speaker === "ai") {
        dispatch({ type: "TRANSITION_SPEAKING", speechStartAt: event.at });
      }
      break;

    case "audio-chunk":
      // The component-provider path streams AI audio chunks; the hook does
      // not buffer audio here — that's the adapter or UI layer's concern.
      break;

    case "error":
      dispatch({ type: "ERROR", kind: event.kind, at: Date.now() });
      break;
  }
}
