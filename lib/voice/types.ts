// Capability-tiered voice provider interfaces.
//
// Resolves origin "[Affects R17, R18] capability-tiered or uniform abstraction"
// from docs/brainstorms/2026-05-11-pm-interview-voice-agent-requirements.md.
//
// Cartesia is a ComponentProvider (separate TTS + ASR; app owns turn-taking).
// Sarvam ships both shapes — registered here as ComponentProvider for V1
// because the component split is the more portable integration.
// ElevenLabs Conversational AI is an AgentProvider (end-to-end; agent owns
// the LLM turn loop). The framework-probe path (R14) requires every
// AgentProvider to accept an arbitrary system prompt — enforced at registry
// time by the configure-method check in lib/voice/index.ts.

export type Capabilities = "component" | "agent";

/** Discrete voice agent states surfaced to the UI per R9 + R9a. */
export type VoiceStateKind =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "mic-permission-denied"
  | "network-drop"
  | "asr-no-result"
  | "key-invalid"
  | "provider-timeout";

/** Error kinds the adapter can surface; mirror VoiceStateKind error variants. */
export type VoiceErrorKind =
  | "mic-permission-denied"
  | "network-drop"
  | "asr-no-result"
  | "key-invalid"
  | "provider-timeout";

/** Speaker label on a transcript turn. */
export type Speaker = "user" | "ai";

/** Events streamed from the provider adapter into the state machine. */
export type VoiceEvent =
  | {
      type: "transcript-partial";
      speaker: Speaker;
      text: string;
      confidence?: number;
    }
  | {
      type: "transcript-final";
      speaker: Speaker;
      text: string;
      confidence?: number;
    }
  | { type: "speech-end"; speaker: Speaker; at: number }
  | { type: "speech-start"; speaker: Speaker; at: number }
  | { type: "audio-chunk"; data: ArrayBuffer }
  | { type: "error"; kind: VoiceErrorKind; message: string };

/** Opaque handle returned from startSession. */
export interface SessionHandle {
  readonly id: string;
  readonly providerName: string;
}

/** Shared session-start options across providers. */
export interface SessionOptions {
  apiKey: string;
  /** Per-provider extras (voice id, model id, etc.) — adapters destructure. */
  extras?: Record<string, unknown>;
}

/** Common surface every voice provider exposes. */
export interface VoiceProvider {
  readonly name: string;
  readonly capabilities: Capabilities;
  startSession(opts: SessionOptions): Promise<SessionHandle>;
  endSession(handle: SessionHandle): Promise<void>;
  /** Subscribe to voice events. Returns an unsubscribe function. */
  on(handler: (event: VoiceEvent) => void): () => void;
}

/** TTS + ASR component provider. App owns turn-taking + LLM calls. */
export interface ComponentProvider extends VoiceProvider {
  readonly capabilities: "component";
  /** Stream candidate audio in, get transcript events out. */
  transcribe(audio: AsyncIterable<Float32Array>): AsyncIterable<VoiceEvent>;
  /** Stream LLM text in, get audio chunks out. */
  speak(text: string): AsyncIterable<ArrayBuffer>;
}

/** Configuration the AgentProvider needs to drive the conversation. */
export interface AgentConfig {
  /** Full assembled system prompt — persona + framework library + case. */
  systemPrompt: string;
  /** Voice identifier (provider-specific). */
  voiceId?: string;
}

/** End-to-end conversational agent. Provider owns the turn loop + LLM. */
export interface AgentProvider extends VoiceProvider {
  readonly capabilities: "agent";
  /**
   * Configure the agent for this session. Required before startSession.
   * Registry rejects agent providers that lack this method.
   */
  configure(config: AgentConfig): Promise<void>;
}

/** Type guard for narrowing VoiceProvider to ComponentProvider. */
export function isComponentProvider(
  p: VoiceProvider
): p is ComponentProvider {
  return p.capabilities === "component";
}

/** Type guard for narrowing VoiceProvider to AgentProvider. */
export function isAgentProvider(p: VoiceProvider): p is AgentProvider {
  return p.capabilities === "agent";
}
