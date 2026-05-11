import type {
  ComponentProvider,
  SessionHandle,
  SessionOptions,
  VoiceEvent,
} from "../types";

// U2 STUB. Sarvam exposes both component (Bulbul TTS + Saarika ASR) and
// agent (Sarvam-M) shapes. Registered here as ComponentProvider since the
// component path is more portable for V1; an AgentProvider variant can be
// added in V1.1 if the agent shape becomes the better fit. Full adapter
// implementation lands during V0 bakeoff.

type SarvamListener = (event: VoiceEvent) => void;

export class SarvamProvider implements ComponentProvider {
  readonly name = "sarvam";
  readonly capabilities = "component" as const;

  private listeners: Set<SarvamListener> = new Set();

  on(handler: SarvamListener): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  async startSession(_opts: SessionOptions): Promise<SessionHandle> {
    throw new Error(
      "SarvamProvider.startSession is not yet implemented. " +
        "Full adapter lands during V0 bakeoff per the plan."
    );
  }

  async endSession(_handle: SessionHandle): Promise<void> {
    throw new Error("SarvamProvider.endSession is not yet implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *transcribe(_audio: AsyncIterable<Float32Array>): AsyncIterable<VoiceEvent> {
    throw new Error("SarvamProvider.transcribe is not yet implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *speak(_text: string): AsyncIterable<ArrayBuffer> {
    throw new Error("SarvamProvider.speak is not yet implemented.");
  }
}
