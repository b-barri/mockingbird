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
  addVoiceSeconds,
  getCostSnapshot,
  resetCostTracker,
} from "@/lib/telemetry/cost-tracker";
import { useAudioPlayer } from "@/lib/voice/audio-player";
import { saveCompletedSession } from "@/lib/voice/session-store";
import {
  initialSession,
  sessionReducer,
  turnsForContext,
  type SessionAction,
  type SessionSnapshot,
  type Turn,
} from "@/lib/voice/state-machine";
import type { MicErrorKind } from "@/lib/voice/mic-capture";

// V1.1 session route. Two modes branch off whether the candidate brought a
// voice provider key:
//
//   text mode  — textarea + Send button. Existing flow: dispatch turn →
//                /api/interview SSE → first chunk fires TRANSITION_SPEAKING →
//                partials → finalize → TRANSITION_LISTENING.
//
//   voice mode — push-to-talk mic. Blob → /api/voice/transcribe → user turn
//                → /api/interview SSE (stays in 'thinking' while text streams)
//                → on done, /api/voice/synthesize → play audio (now 'speaking')
//                → audio end fires TRANSITION_LISTENING.
//
// Voice mode is gated on the candidate having (a) chosen Sarvam as their
// voice provider in onboarding and (b) entered a valid Sarvam key. Cartesia
// support ships in a follow-up phase with WebSocket streaming for lower
// latency.

const SUPPORTED_VOICE_PROVIDERS = new Set(["sarvam", "cartesia"]);

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

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const abortRef = useRef<AbortController | null>(null);
  const [llmKey, setLlmKey] = useState<string | null>(null);
  const [voiceKey, setVoiceKey] = useState<string | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);
  const { isPlaying, playBase64Audio, stop: stopAudio } = useAudioPlayer();

  // Load keys from storage on mount; redirect if no LLM key.
  useEffect(() => {
    const llm = getKey("llm");
    if (!llm) {
      router.replace("/onboarding");
      return;
    }
    setLlmKey(llm);
    if (SUPPORTED_VOICE_PROVIDERS.has(voiceProvider)) {
      const v = getKey(voiceProvider as "sarvam" | "cartesia");
      if (v) setVoiceKey(v);
    }
    setKeyChecked(true);
  }, [router, voiceProvider]);

  // Reset cost tracker per-session (R6c).
  useEffect(() => {
    resetCostTracker({ llmProvider, voiceProvider });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort any in-flight stream + cancel any audio playback on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopAudio();
    };
  }, [stopAudio]);

  const voiceModeActive = Boolean(voiceKey) && SUPPORTED_VOICE_PROVIDERS.has(voiceProvider);

  const currentQuestion = useMemo(() => {
    for (let i = session.turns.length - 1; i >= 0; i--) {
      const t = session.turns[i];
      if (t.speaker === "ai" && !t.stricken) return t.text;
    }
    return caseTemplate.prompt;
  }, [session.turns, caseTemplate.prompt]);

  /**
   * Run /api/interview as a streaming SSE call. Returns the full accumulated
   * AI text. Dispatches TRANSCRIPT_PARTIAL chunks during the stream and a
   * TRANSCRIPT_FINAL at the end. Optionally fires TRANSITION_SPEAKING on the
   * first chunk (text mode); voice mode defers that to audio playback start.
   */
  const streamLlmResponse = useCallback(
    async (opts: {
      turnsForAPI: Turn[];
      aiTurnId: string;
      fireSpeakingOnFirstChunk: boolean;
      signal: AbortSignal;
    }): Promise<{ ok: true; text: string } | { ok: false; reason: ErrorKind; message: string }> => {
      if (!llmKey) {
        return { ok: false, reason: "key-invalid", message: "No LLM key" };
      }

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
            turns: opts.turnsForAPI,
          }),
          signal: opts.signal,
        });

        if (response.status === 401) {
          return { ok: false, reason: "key-invalid", message: "Anthropic rejected the key" };
        }
        if (!response.ok || !response.body) {
          return { ok: false, reason: "provider-timeout", message: `LLM ${response.status}` };
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
                if (opts.fireSpeakingOnFirstChunk) {
                  dispatch({
                    type: "TRANSITION_SPEAKING",
                    speechStartAt: Date.now(),
                  });
                }
                firstChunk = false;
              }
              accumulated += parsed.text;
              dispatch({
                type: "TRANSCRIPT_PARTIAL",
                id: opts.aiTurnId,
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
            id: opts.aiTurnId,
            speaker: "ai",
            text: accumulated,
            at: Date.now(),
          });
        }
        return { ok: true, text: accumulated };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return { ok: false, reason: "aborted", message: "aborted" };
        }
        const message = err instanceof Error ? err.message : "Unknown LLM error";
        // eslint-disable-next-line no-console
        console.error("LLM stream failed:", message);
        const reason: ErrorKind = /401|unauthor|invalid.*key/i.test(message)
          ? "key-invalid"
          : /network|fetch|connection|offline/i.test(message)
            ? "network-drop"
            : "provider-timeout";
        return { ok: false, reason, message };
      }
    },
    [llmKey, caseTemplate.id]
  );

  /** Text mode: TRANSCRIPT_FINAL the user turn, run LLM, listening. */
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

      const result = await streamLlmResponse({
        turnsForAPI,
        aiTurnId: aiId,
        fireSpeakingOnFirstChunk: true,
        signal: controller.signal,
      });

      if (abortRef.current === controller) abortRef.current = null;
      if (!result.ok) {
        applyStreamError(dispatch, result.reason);
        return;
      }
      dispatch({ type: "TRANSITION_LISTENING" });
    },
    [llmKey, streamLlmResponse]
  );

  /** Voice mode: blob → transcribe → user turn → LLM → synthesize → play → listening. */
  const handleVoiceBlob = useCallback(
    async (blob: Blob, durationMs: number) => {
      if (!llmKey || !voiceKey) return;

      // Treat the entire transcribe+LLM+TTS window as "thinking" — the orb
      // shows a single contemplative state instead of flipping between
      // labels candidates would have to interpret.
      dispatch({ type: "TRANSITION_THINKING", listenEndAt: Date.now() });
      addVoiceSeconds(durationMs / 1000);

      const controller = new AbortController();
      abortRef.current = controller;

      // 1. Transcribe
      let transcript: string;
      try {
        const transcribeForm = new FormData();
        transcribeForm.append("audio", blob, "audio.webm");
        const resp = await fetch("/api/voice/transcribe", {
          method: "POST",
          headers: {
            "x-voice-key": voiceKey,
            "x-voice-provider": voiceProvider,
          },
          body: transcribeForm,
          signal: controller.signal,
        });
        if (resp.status === 401) {
          applyStreamError(dispatch, "key-invalid");
          return;
        }
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          // eslint-disable-next-line no-console
          console.error("Sarvam STT failed:", resp.status, text);
          applyStreamError(dispatch, "provider-timeout");
          return;
        }
        const json = (await resp.json()) as { transcript?: string };
        transcript = (json.transcript ?? "").trim();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // eslint-disable-next-line no-console
        console.error("Sarvam STT fetch failed:", err);
        applyStreamError(dispatch, "network-drop");
        return;
      }

      if (!transcript) {
        // ASR returned empty — give the candidate a chance to retry.
        applyStreamError(dispatch, "asr-no-result");
        return;
      }

      // 2. Dispatch user turn with the transcription
      const userId = newTurnId("user");
      const userTurnAt = Date.now();
      dispatch({
        type: "TRANSCRIPT_FINAL",
        id: userId,
        speaker: "user",
        text: transcript,
        at: userTurnAt,
      });

      // 3. LLM stream (stay in 'thinking' — voice mode fires speaking on audio play)
      const aiId = newTurnId("ai");
      const turnsForAPI: Turn[] = [
        ...turnsForContext(sessionRef.current),
        {
          id: userId,
          speaker: "user",
          text: transcript,
          partial: false,
          stricken: false,
          timestamp: userTurnAt,
        },
      ];

      const llmResult = await streamLlmResponse({
        turnsForAPI,
        aiTurnId: aiId,
        fireSpeakingOnFirstChunk: false,
        signal: controller.signal,
      });

      if (!llmResult.ok) {
        if (abortRef.current === controller) abortRef.current = null;
        applyStreamError(dispatch, llmResult.reason);
        return;
      }

      // 4. Synthesize
      let audios: string[];
      let audioContentType = "audio/wav";
      try {
        const resp = await fetch("/api/voice/synthesize", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-voice-key": voiceKey,
            "x-voice-provider": voiceProvider,
          },
          body: JSON.stringify({ text: llmResult.text }),
          signal: controller.signal,
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          // eslint-disable-next-line no-console
          console.error("Sarvam TTS failed:", resp.status, text);
          // Fall back to text mode for this turn — the AI text is already in
          // the transcript; we just couldn't speak it. Surface as a
          // recoverable provider-timeout so the candidate can retry.
          applyStreamError(dispatch, "provider-timeout");
          return;
        }
        const json = (await resp.json()) as {
          audios?: string[];
          contentType?: string;
        };
        audios = json.audios ?? [];
        audioContentType = json.contentType ?? "audio/wav";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // eslint-disable-next-line no-console
        console.error("Sarvam TTS fetch failed:", err);
        applyStreamError(dispatch, "network-drop");
        return;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }

      if (audios.length === 0) {
        // No audio came back — go straight back to listening rather than
        // hang on speaking forever.
        dispatch({ type: "TRANSITION_LISTENING" });
        return;
      }

      // 5. Play audio. Speaking state turns on at play start, listening at end.
      dispatch({
        type: "TRANSITION_SPEAKING",
        speechStartAt: Date.now(),
      });
      await playBase64Audio(audios, {
        contentType: audioContentType,
        onEnded: () => {
          // Rough approximation of TTS output seconds via text length (~20 chars/sec).
          addVoiceSeconds(llmResult.text.length / 20);
          dispatch({ type: "TRANSITION_LISTENING" });
        },
        onError: (msg) => {
          // eslint-disable-next-line no-console
          console.error("Audio playback failed:", msg);
          dispatch({ type: "TRANSITION_LISTENING" });
        },
      });
    },
    [llmKey, voiceKey, voiceProvider, streamLlmResponse, playBase64Audio]
  );

  const handleEndSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopAudio();

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
  }, [caseTemplate.id, router, stopAudio]);

  const handleErrorAction = useCallback(() => {
    if (session.state.kind === "key-invalid") {
      router.push("/onboarding");
      return;
    }
    if (
      session.state.kind === "provider-timeout" ||
      session.state.kind === "network-drop" ||
      session.state.kind === "asr-no-result" ||
      session.state.kind === "mic-permission-denied"
    ) {
      dispatch({ type: "TRANSITION_LISTENING" });
    }
  }, [session.state.kind, router]);

  const handleMicError = useCallback(
    (kind: MicErrorKind, _message: string) => {
      void _message;
      if (kind === "permission-denied") {
        dispatch({
          type: "ERROR",
          kind: "mic-permission-denied",
          at: Date.now(),
        });
        return;
      }
      // 'too-short' shows inline via the MicButton's error text. No
      // state-machine transition needed — candidate can just press the
      // mic again. 'no-device'/'recorder-error' are exceptional and
      // worth a hard error UI.
      if (kind === "too-short") return;
      dispatch({ type: "ERROR", kind: "provider-timeout", at: Date.now() });
    },
    []
  );

  if (!keyChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream text-sm text-mute">
        Loading session…
      </div>
    );
  }

  // While audio is playing back, suppress the mic affordance so the candidate
  // can't talk over the interviewer. The state machine already says 'speaking'
  // during playback so the textInputVisible / voiceModeActive checks gate
  // automatically; nothing extra to do here.
  void isPlaying;

  return (
    <ThreePanel
      session={session}
      dispatch={dispatch as (action: SessionAction) => void}
      caseTitle={caseTemplate.title}
      currentQuestion={currentQuestion}
      onEndSession={handleEndSession}
      onSubmitTurn={voiceModeActive ? undefined : handleSubmitTurn}
      onVoiceBlob={voiceModeActive ? handleVoiceBlob : undefined}
      onMicError={voiceModeActive ? handleMicError : undefined}
      onErrorAction={handleErrorAction}
    />
  );
}

type ErrorKind = "key-invalid" | "network-drop" | "provider-timeout" | "asr-no-result" | "aborted";

function applyStreamError(
  dispatch: (action: SessionAction) => void,
  reason: ErrorKind
): void {
  if (reason === "aborted") return; // intentional teardown — leave state alone
  dispatch({ type: "ERROR", kind: reason, at: Date.now() });
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
