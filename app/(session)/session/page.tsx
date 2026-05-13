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
import { getKey, setKey, type KeyProvider } from "@/lib/auth/key-storage";
import {
  checkFormat,
  providerConsoleUrl,
  providerLabel,
} from "@/lib/auth/key-validation";
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

  // Start the session in `idle` — no AI opening, no transcript turns. The
  // candidate clicks the "Start interview" button to trigger the LLM-
  // generated opening (greeting + case statement). This pattern (a) lets
  // the persona's "no probe in opening" instruction actually run rather
  // than skipping the LLM with a pre-seeded turn, and (b) satisfies the
  // browser autoplay gate by collecting a fresh user gesture on the
  // session page before audio plays.
  const [session, dispatch] = useReducer(sessionReducer, initialSession);

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

  // Whether the candidate's onboarding configured a usable voice provider.
  // Used to gate the input-mode toggle: a text-only candidate has nothing to
  // switch to, so the toggle is hidden for them.
  const voiceAvailable = Boolean(voiceKey) && SUPPORTED_VOICE_PROVIDERS.has(voiceProvider);

  // Input mode is user-controlled per session rather than derived from key
  // presence. Default is voice when available (preserves the original first
  // impression), but the candidate can toggle to text mid-session — useful
  // for long-form answers, quiet environments, mic flakiness, or just
  // preference. Surfaced during dogfood as a coercion gap in the original
  // derived-state design.
  const [inputMode, setInputMode] = useState<"voice" | "text">(
    voiceAvailable ? "voice" : "text"
  );
  const voiceModeActive = inputMode === "voice";

  // Mid-session voice-key prompt. When a candidate without a voice key
  // tries to switch to voice mode, instead of silently dropping the click
  // (the old behavior hid the toggle entirely), we open a small modal so
  // they can paste a key without losing session state.
  const [voiceKeyPromptOpen, setVoiceKeyPromptOpen] = useState(false);

  const toggleInputMode = useCallback(() => {
    setInputMode((m) => {
      // text → voice requires a voice key. If we don't have one yet, open
      // the prompt and stay in text mode; the prompt's confirm handler will
      // flip the mode once a valid key is stored.
      if (m === "text" && !voiceAvailable) {
        setVoiceKeyPromptOpen(true);
        return m;
      }
      return m === "voice" ? "text" : "voice";
    });
  }, [voiceAvailable]);

  const handleVoiceKeySubmitted = useCallback(
    (key: string) => {
      setKey(voiceProvider as KeyProvider, key);
      setVoiceKey(key);
      setVoiceKeyPromptOpen(false);
      setInputMode("voice");
    },
    [voiceProvider]
  );

  // currentQuestion = latest non-stricken AI turn. Updates live as the LLM
  // stream fills the turn via TRANSCRIPT_PARTIAL. Undefined while idle so
  // the case prompt doesn't leak before Alex actually delivers it.
  const currentQuestion = useMemo<string | undefined>(() => {
    for (let i = session.turns.length - 1; i >= 0; i--) {
      const t = session.turns[i];
      if (t.speaker === "ai" && !t.stricken) return t.text;
    }
    return undefined;
  }, [session.turns]);

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

  /** Synthesize `text` via /api/voice/synthesize and play it back. Dispatches
   *  TRANSITION_SPEAKING when audio starts, TRANSITION_LISTENING when audio
   *  ends. Returns the playback start status; the listening transition fires
   *  asynchronously via onEnded. Used by both the opening and per-turn flows. */
  const synthesizeAndPlay = useCallback(
    async (text: string, signal: AbortSignal): Promise<{ ok: true } | { ok: false; reason: ErrorKind; message: string }> => {
      if (!voiceKey) {
        return { ok: false, reason: "key-invalid", message: "No voice key" };
      }
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
          body: JSON.stringify({ text }),
          signal,
        });
        if (resp.status === 401) {
          return { ok: false, reason: "key-invalid", message: `TTS ${resp.status}` };
        }
        if (!resp.ok) {
          const body = await resp.text().catch(() => "");
          // eslint-disable-next-line no-console
          console.error("Voice TTS failed:", resp.status, body);
          return { ok: false, reason: "provider-timeout", message: `TTS ${resp.status}` };
        }
        const json = (await resp.json()) as {
          audios?: string[];
          contentType?: string;
        };
        audios = json.audios ?? [];
        audioContentType = json.contentType ?? "audio/wav";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return { ok: false, reason: "aborted", message: "aborted" };
        }
        // eslint-disable-next-line no-console
        console.error("Voice TTS fetch failed:", err);
        return { ok: false, reason: "network-drop", message: "fetch failed" };
      }

      if (audios.length === 0) {
        // Empty audio array — go straight back to listening rather than hang.
        dispatch({ type: "TRANSITION_LISTENING" });
        return { ok: true };
      }

      dispatch({ type: "TRANSITION_SPEAKING", speechStartAt: Date.now() });
      await playBase64Audio(audios, {
        contentType: audioContentType,
        onEnded: () => {
          // Rough approximation of TTS output seconds via text length (~20 chars/sec).
          addVoiceSeconds(text.length / 20);
          dispatch({ type: "TRANSITION_LISTENING" });
        },
        onError: (msg) => {
          // eslint-disable-next-line no-console
          console.error("Audio playback failed:", msg);
          dispatch({ type: "TRANSITION_LISTENING" });
        },
      });
      return { ok: true };
    },
    [voiceKey, voiceProvider, playBase64Audio]
  );

  /** Start the session: greet, deliver case, stop. The candidate clicks the
   *  Start button which lands here. In voice mode this is also where the
   *  browser autoplay gate is satisfied — the click is the user gesture. */
  const handleStartInterview = useCallback(async () => {
    if (!llmKey) return;
    if (session.state.kind !== "idle") return; // already started

    const now = Date.now();
    dispatch({ type: "START_SESSION", at: now });
    dispatch({ type: "TRANSITION_THINKING", listenEndAt: now });

    const aiId = newTurnId("ai");
    const controller = new AbortController();
    abortRef.current = controller;

    // Anthropic rejects empty messages arrays — we have to send something.
    // A minimal synthetic "Hello" mirrors the candidate connecting to the
    // call and lets the system prompt's opening instructions take over
    // (greet + state case + stop, no probe). This turn is API-only; we
    // don't dispatch it to the state machine so the transcript stays
    // candidate-authored.
    const kickMessage: Turn = {
      id: "session-kick",
      speaker: "user",
      text: "Hello.",
      partial: false,
      stricken: false,
      timestamp: now,
    };
    const llmResult = await streamLlmResponse({
      turnsForAPI: [kickMessage],
      aiTurnId: aiId,
      // Text mode: first chunk lights speaking. Voice mode: defer to audio
      // playback start so the candidate doesn't see "speaking" while text
      // streams but no sound plays.
      fireSpeakingOnFirstChunk: !voiceModeActive,
      signal: controller.signal,
    });

    if (abortRef.current === controller) abortRef.current = null;
    if (!llmResult.ok) {
      applyStreamError(dispatch, llmResult.reason);
      return;
    }

    if (voiceModeActive && llmResult.text) {
      const ttsController = new AbortController();
      abortRef.current = ttsController;
      const ttsResult = await synthesizeAndPlay(
        llmResult.text,
        ttsController.signal
      );
      if (abortRef.current === ttsController) abortRef.current = null;
      if (!ttsResult.ok) {
        applyStreamError(dispatch, ttsResult.reason);
      }
      return;
    }

    // Text mode: streamLlmResponse already fired TRANSITION_SPEAKING on
    // the first chunk; close the loop.
    dispatch({ type: "TRANSITION_LISTENING" });
  }, [llmKey, session.state.kind, voiceModeActive, streamLlmResponse, synthesizeAndPlay]);

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

      // 4 + 5. Synthesize + play. synthesizeAndPlay owns the
      // TRANSITION_SPEAKING / TRANSITION_LISTENING dispatches.
      const ttsResult = await synthesizeAndPlay(llmResult.text, controller.signal);
      if (abortRef.current === controller) abortRef.current = null;
      if (!ttsResult.ok) {
        applyStreamError(dispatch, ttsResult.reason);
        return;
      }
    },
    [llmKey, voiceKey, voiceProvider, streamLlmResponse, synthesizeAndPlay]
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
    <>
      <ThreePanel
        session={session}
        dispatch={dispatch as (action: SessionAction) => void}
        caseTitle={caseTemplate.title}
        currentQuestion={currentQuestion}
        onEndSession={handleEndSession}
        onStartInterview={handleStartInterview}
        onSubmitTurn={voiceModeActive ? undefined : handleSubmitTurn}
        onVoiceBlob={voiceModeActive ? handleVoiceBlob : undefined}
        onMicError={voiceModeActive ? handleMicError : undefined}
        onErrorAction={handleErrorAction}
        voiceProvider={voiceProvider}
        inputMode={inputMode}
        onToggleInputMode={toggleInputMode}
      />
      {voiceKeyPromptOpen && (
        <VoiceKeyPrompt
          provider={voiceProvider}
          onCancel={() => setVoiceKeyPromptOpen(false)}
          onSubmit={handleVoiceKeySubmitted}
        />
      )}
    </>
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

/**
 * Lightweight inline modal that asks the candidate for a voice provider key
 * mid-session. Rendered when the toggle flips to "voice" but no key is
 * configured yet. Stays out of components/onboarding/ because it's
 * session-specific (no "remember me" toggle, no validation ping, no
 * provider-picking) — pasting and confirming is the entire flow.
 */
function VoiceKeyPrompt({
  provider,
  onSubmit,
  onCancel,
}: {
  provider: string;
  onSubmit: (key: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const label = providerLabel(provider);
  const consoleUrl = providerConsoleUrl(provider);
  const trimmed = value.trim();
  const formatCheck = trimmed ? checkFormat(provider, trimmed) : { ok: true };
  const canSubmit = trimmed.length > 0 && formatCheck.ok;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-key-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-ink/[0.10] bg-cream p-6 shadow-xl"
      >
        <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-coral">
          <span className="pulse-dot" />
          enable voice
        </div>
        <h2
          id="voice-key-prompt-title"
          className="mb-2 font-display text-2xl tracking-tight text-ink"
        >
          Paste your {label} API key
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-mute">
          Voice mode runs speech-to-text and text-to-speech through {label}.
          The key stays in your browser — we never store it server-side.
          {consoleUrl && (
            <>
              {" "}
              <a
                href={`https://${consoleUrl}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-coral underline-offset-2 hover:underline"
              >
                Get a key ↗
              </a>
            </>
          )}
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${label} API key`}
          data-testid="voice-key-prompt-input"
          className="w-full rounded-md border border-ink/[0.18] bg-white px-3 py-2 font-mono text-sm text-ink placeholder:text-mute/60 focus:border-ink/50 focus:outline-none"
        />
        {trimmed && !formatCheck.ok && (
          <p className="mt-2 text-xs text-red-700">{formatCheck.reason}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-ink/20 bg-cream px-4 py-2 font-mono text-[12px] text-ink hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="voice-key-prompt-submit"
            className="rounded-md bg-ink px-4 py-2 font-mono text-[12px] text-cream hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enable voice
          </button>
        </div>
      </form>
    </div>
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
