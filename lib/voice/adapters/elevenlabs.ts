import type {
  AgentConfig,
  AgentProvider,
  SessionHandle,
  SessionOptions,
  VoiceEvent,
} from "../types";

// U2 STUB. ElevenLabs Conversational AI is the end-to-end agent that owns
// the LLM turn loop. configure() must accept an arbitrary system prompt so
// the framework-aware probe path (R14) works through this adapter. Full
// implementation lands during V0 bakeoff.

type ElevenLabsListener = (event: VoiceEvent) => void;

export class ElevenLabsProvider implements AgentProvider {
  readonly name = "elevenlabs";
  readonly capabilities = "agent" as const;

  private listeners: Set<ElevenLabsListener> = new Set();
  private configured = false;

  on(handler: ElevenLabsListener): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  async configure(_config: AgentConfig): Promise<void> {
    // Stub: accept the config but don't actually transmit it.
    this.configured = true;
  }

  async startSession(_opts: SessionOptions): Promise<SessionHandle> {
    if (!this.configured) {
      throw new Error(
        "ElevenLabsProvider.startSession called before configure(). " +
          "Agent providers require configure() with the assembled system prompt first."
      );
    }
    throw new Error(
      "ElevenLabsProvider.startSession is not yet implemented. " +
        "Full adapter lands during V0 bakeoff per the plan."
    );
  }

  async endSession(_handle: SessionHandle): Promise<void> {
    throw new Error(
      "ElevenLabsProvider.endSession is not yet implemented."
    );
  }
}
