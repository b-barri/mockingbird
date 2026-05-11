import { describe, expect, it } from "vitest";
import {
  PROVIDER_NAMES,
  UnknownProviderError,
  getProvider,
  isAgentProvider,
  isComponentProvider,
  listProviders,
} from "../index";

describe("voice provider registry", () => {
  it("getProvider returns ComponentProvider for cartesia", () => {
    const p = getProvider("cartesia");
    expect(p.name).toBe("cartesia");
    expect(isComponentProvider(p)).toBe(true);
  });

  it("getProvider returns ComponentProvider for sarvam", () => {
    const p = getProvider("sarvam");
    expect(p.name).toBe("sarvam");
    expect(isComponentProvider(p)).toBe(true);
  });

  it("getProvider returns AgentProvider for elevenlabs", () => {
    const p = getProvider("elevenlabs");
    expect(p.name).toBe("elevenlabs");
    expect(isAgentProvider(p)).toBe(true);
  });

  it("getProvider throws UnknownProviderError for unknown names", () => {
    expect(() => getProvider("not-real")).toThrow(UnknownProviderError);
    expect(() => getProvider("not-real")).toThrow(/Known providers/);
  });

  it("listProviders returns all three with correct capabilities", () => {
    const inventory = listProviders();
    expect(inventory).toHaveLength(3);
    expect(inventory).toEqual(
      expect.arrayContaining([
        { name: "cartesia", capabilities: "component" },
        { name: "sarvam", capabilities: "component" },
        { name: "elevenlabs", capabilities: "agent" },
      ])
    );
  });

  it("PROVIDER_NAMES is a stable readonly list", () => {
    expect(PROVIDER_NAMES).toEqual(["cartesia", "sarvam", "elevenlabs"]);
  });

  it("each call to getProvider returns a fresh instance", () => {
    const a = getProvider("cartesia");
    const b = getProvider("cartesia");
    expect(a).not.toBe(b);
  });
});
