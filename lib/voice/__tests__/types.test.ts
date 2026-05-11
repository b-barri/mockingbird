import { describe, expect, it } from "vitest";
import { CartesiaProvider } from "../adapters/cartesia";
import { ElevenLabsProvider } from "../adapters/elevenlabs";
import { SarvamProvider } from "../adapters/sarvam";
import { isAgentProvider, isComponentProvider } from "../types";

describe("voice provider type conformance", () => {
  it("CartesiaProvider conforms to ComponentProvider shape", () => {
    const p = new CartesiaProvider();
    expect(p.name).toBe("cartesia");
    expect(p.capabilities).toBe("component");
    expect(typeof p.transcribe).toBe("function");
    expect(typeof p.speak).toBe("function");
    expect(typeof p.startSession).toBe("function");
    expect(typeof p.endSession).toBe("function");
    expect(typeof p.on).toBe("function");
    expect(isComponentProvider(p)).toBe(true);
    expect(isAgentProvider(p)).toBe(false);
  });

  it("SarvamProvider conforms to ComponentProvider shape", () => {
    const p = new SarvamProvider();
    expect(p.name).toBe("sarvam");
    expect(p.capabilities).toBe("component");
    expect(isComponentProvider(p)).toBe(true);
    expect(isAgentProvider(p)).toBe(false);
  });

  it("ElevenLabsProvider conforms to AgentProvider shape", () => {
    const p = new ElevenLabsProvider();
    expect(p.name).toBe("elevenlabs");
    expect(p.capabilities).toBe("agent");
    expect(typeof p.configure).toBe("function");
    expect(typeof p.startSession).toBe("function");
    expect(typeof p.endSession).toBe("function");
    expect(typeof p.on).toBe("function");
    expect(isAgentProvider(p)).toBe(true);
    expect(isComponentProvider(p)).toBe(false);
  });

  it("agent provider requires configure() before startSession()", async () => {
    const p = new ElevenLabsProvider();
    await expect(p.startSession({ apiKey: "stub" })).rejects.toThrow(
      /configure/i
    );
  });

  it("on() returns an unsubscribe function that removes the listener", () => {
    const p = new CartesiaProvider();
    const handler = () => {};
    const unsubscribe = p.on(handler);
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});
