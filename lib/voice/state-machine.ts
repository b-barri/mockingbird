// Voice session state machine.
//
// Pure reducer — no side effects, no telemetry emission, no timers. Side
// effects (provider event subscription, telemetry events, timeouts) live in
// the useVoiceSession hook in use-voice-session.ts. Keeping the reducer pure
// means we can test every R9 / R9a transition deterministically without
// mocks.
//
// R9 happy-path states: listening / thinking / speaking, looping.
// R9a error states: mic-permission-denied, network-drop, asr-no-result,
// key-invalid, provider-timeout.
// R9b latency capture: listenEndAt + speechStartAt markers carried on the
// state object so the hook can emit telemetry on the listening→thinking→
// speaking edge.
// R11 strike-through: turn-level `stricken` flag the LLM proxy reads to
// exclude struck turns from context.

import type { Speaker, VoiceErrorKind, VoiceStateKind } from "./types";

export interface Turn {
  readonly id: string;
  readonly speaker: Speaker;
  readonly text: string;
  readonly confidence?: number;
  readonly timestamp: number;
  /** Partial = still being transcribed; replaced on final. */
  readonly partial: boolean;
  /** R11: candidate struck this turn — exclude from LLM context. */
  readonly stricken: boolean;
}

export type SessionState =
  | { readonly kind: "idle" }
  | { readonly kind: "listening" }
  | {
      readonly kind: "thinking";
      readonly listenEndAt: number;
    }
  | {
      readonly kind: "speaking";
      readonly listenEndAt: number;
      readonly speechStartAt: number;
      /** End-to-end latency (R9b). p50 budget < 1.5s, p95 < 2.5s. */
      readonly latencyMs: number;
    }
  | { readonly kind: "mic-permission-denied" }
  | {
      readonly kind: "network-drop";
      readonly retryAt: number;
      readonly attemptCount: number;
    }
  | { readonly kind: "asr-no-result" }
  | { readonly kind: "key-invalid" }
  | { readonly kind: "provider-timeout" };

export interface SessionSnapshot {
  readonly state: SessionState;
  readonly turns: ReadonlyArray<Turn>;
  readonly scratchpad: string;
  readonly scratchpadCollapsed: boolean;
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  /** Latencies recorded across the session — fuels R9b reporting and U9. */
  readonly latencyMs: ReadonlyArray<number>;
}

export const initialSession: SessionSnapshot = {
  state: { kind: "idle" },
  turns: [],
  scratchpad: "",
  scratchpadCollapsed: false,
  startedAt: null,
  endedAt: null,
  latencyMs: [],
};

export type SessionAction =
  | { type: "START_SESSION"; at: number }
  | { type: "END_SESSION"; at: number }
  | { type: "TRANSITION_LISTENING" }
  | { type: "TRANSITION_THINKING"; listenEndAt: number }
  | { type: "TRANSITION_SPEAKING"; speechStartAt: number }
  | {
      type: "TRANSCRIPT_PARTIAL";
      id: string;
      speaker: Speaker;
      text: string;
      confidence?: number;
      at: number;
    }
  | {
      type: "TRANSCRIPT_FINAL";
      id: string;
      speaker: Speaker;
      text: string;
      confidence?: number;
      at: number;
    }
  | { type: "STRIKE_TURN"; id: string }
  | { type: "SCRATCHPAD_UPDATE"; text: string }
  | { type: "SCRATCHPAD_COLLAPSE"; collapsed: boolean }
  | { type: "ERROR"; kind: VoiceErrorKind; at: number; attemptCount?: number }
  | { type: "RECOVER_NETWORK"; at: number };

export function sessionReducer(
  state: SessionSnapshot,
  action: SessionAction
): SessionSnapshot {
  switch (action.type) {
    case "START_SESSION":
      return {
        ...initialSession,
        state: { kind: "listening" },
        startedAt: action.at,
      };

    case "END_SESSION":
      return {
        ...state,
        state: { kind: "idle" },
        endedAt: action.at,
      };

    case "TRANSITION_LISTENING": {
      // Cycling back from speaking. Drop listening-state-specific markers.
      return { ...state, state: { kind: "listening" } };
    }

    case "TRANSITION_THINKING": {
      // listen-end → thinking. Capture listenEndAt marker.
      return {
        ...state,
        state: { kind: "thinking", listenEndAt: action.listenEndAt },
      };
    }

    case "TRANSITION_SPEAKING": {
      // thinking → speaking. Compute latency from prior listenEndAt.
      if (state.state.kind !== "thinking") {
        // Out-of-order action; the only legal predecessor is thinking. Drop.
        return state;
      }
      const listenEndAt = state.state.listenEndAt;
      const latencyMs = action.speechStartAt - listenEndAt;
      return {
        ...state,
        state: {
          kind: "speaking",
          listenEndAt,
          speechStartAt: action.speechStartAt,
          latencyMs,
        },
        latencyMs: [...state.latencyMs, latencyMs],
      };
    }

    case "TRANSCRIPT_PARTIAL": {
      // Replace any existing partial turn with this id, otherwise append.
      const existing = state.turns.find((t) => t.id === action.id);
      if (existing) {
        return {
          ...state,
          turns: state.turns.map((t) =>
            t.id === action.id
              ? {
                  ...t,
                  text: action.text,
                  confidence: action.confidence,
                  partial: true,
                  timestamp: action.at,
                }
              : t
          ),
        };
      }
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            id: action.id,
            speaker: action.speaker,
            text: action.text,
            confidence: action.confidence,
            partial: true,
            stricken: false,
            timestamp: action.at,
          },
        ],
      };
    }

    case "TRANSCRIPT_FINAL": {
      // Finalize the matching partial turn, or append a fresh final turn.
      const existing = state.turns.find((t) => t.id === action.id);
      if (existing) {
        return {
          ...state,
          turns: state.turns.map((t) =>
            t.id === action.id
              ? {
                  ...t,
                  text: action.text,
                  confidence: action.confidence,
                  partial: false,
                  timestamp: action.at,
                }
              : t
          ),
        };
      }
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            id: action.id,
            speaker: action.speaker,
            text: action.text,
            confidence: action.confidence,
            partial: false,
            stricken: false,
            timestamp: action.at,
          },
        ],
      };
    }

    case "STRIKE_TURN": {
      // R11: toggle the stricken flag on this turn. LLM proxy reads this
      // and excludes struck turns from the next context window.
      return {
        ...state,
        turns: state.turns.map((t) =>
          t.id === action.id ? { ...t, stricken: !t.stricken } : t
        ),
      };
    }

    case "SCRATCHPAD_UPDATE":
      return { ...state, scratchpad: action.text };

    case "SCRATCHPAD_COLLAPSE":
      return { ...state, scratchpadCollapsed: action.collapsed };

    case "ERROR": {
      // Map error kind to terminal/recoverable state.
      const kind = action.kind;
      if (kind === "network-drop") {
        const attemptCount = action.attemptCount ?? 1;
        return {
          ...state,
          state: {
            kind,
            retryAt: action.at + retryBackoffMs(attemptCount),
            attemptCount,
          },
        };
      }
      return { ...state, state: { kind } as SessionState };
    }

    case "RECOVER_NETWORK": {
      // Auto-retry from network-drop returns us to listening.
      if (state.state.kind !== "network-drop") return state;
      return { ...state, state: { kind: "listening" } };
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

/** Exponential-ish backoff for network-drop auto-retry. Capped at 8s. */
function retryBackoffMs(attemptCount: number): number {
  const base = 1000;
  const ms = base * Math.min(8, 2 ** (attemptCount - 1));
  return ms;
}

/** Currently-displayable state kind for the UI to render. */
export function currentStateKind(snapshot: SessionSnapshot): VoiceStateKind {
  return snapshot.state.kind;
}

/** R11 helper: turns the LLM should see (excludes struck + partial turns). */
export function turnsForContext(snapshot: SessionSnapshot): ReadonlyArray<Turn> {
  return snapshot.turns.filter((t) => !t.stricken && !t.partial);
}
