import type {
  ComponentProvider,
  SessionHandle,
  SessionOptions,
  VoiceEvent,
} from "../types";

// U2 STUB. Full Cartesia Sonic implementation lands during the V0 bakeoff —
// see docs/brainstorms/...-requirements.md "Pre-V1 Operator Deliverables".
// Stubs throw on the operational methods so any accidental use surfaces
// loudly. The interface shape is the load-bearing contract this unit
// delivers; downstream units (U3 state machine, U4 UI) consume that shape.

type CartesiaListener = (event: VoiceEvent) => void;

export class CartesiaProvider implements ComponentProvider {
  readonly name = "cartesia";
  readonly capabilities = "component" as const;

  private listeners: Set<CartesiaListener> = new Set();

  on(handler: CartesiaListener): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  async startSession(_opts: SessionOptions): Promise<SessionHandle> {
    throw new Error(
      "CartesiaProvider.startSession is not yet implemented. " +
        "Full adapter lands during V0 bakeoff per the plan."
    );
  }

  async endSession(_handle: SessionHandle): Promise<void> {
    throw new Error(
      "CartesiaProvider.endSession is not yet implemented."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *transcribe(_audio: AsyncIterable<Float32Array>): AsyncIterable<VoiceEvent> {
    throw new Error(
      "CartesiaProvider.transcribe is not yet implemented."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *speak(_text: string): AsyncIterable<ArrayBuffer> {
    throw new Error(
      "CartesiaProvider.speak is not yet implemented."
    );
  }
}
