import { describe, expect, it } from "vitest";
import {
  checkFormat,
  providerConsoleUrl,
  providerLabel,
} from "../key-validation";

describe("checkFormat", () => {
  it("rejects empty keys", () => {
    expect(checkFormat("anthropic", "").ok).toBe(false);
    expect(checkFormat("anthropic", "   ").ok).toBe(false);
  });

  it("accepts valid Anthropic format (sk-ant-...)", () => {
    const result = checkFormat("anthropic", "sk-ant-abcDEF1234567890_-aB");
    expect(result.ok).toBe(true);
  });

  it("rejects Anthropic key without sk-ant- prefix", () => {
    const result = checkFormat("anthropic", "sk-abcDEF1234567890");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Anthropic/);
    expect(result.reason).toMatch(/console\.anthropic\.com/);
  });

  it("accepts valid OpenAI format", () => {
    expect(checkFormat("openai", "sk-abcDEF1234567890_-aB").ok).toBe(true);
  });

  it("rejects OpenAI key without sk- prefix", () => {
    const result = checkFormat("openai", "abcDEF1234567890");
    expect(result.ok).toBe(false);
  });

  it("accepts valid ElevenLabs format (sk_...)", () => {
    expect(
      checkFormat("elevenlabs", "sk_abcDEF1234567890123456789_-aB").ok
    ).toBe(true);
  });

  it("accepts unknown providers on format (defers to server ping)", () => {
    expect(checkFormat("unknown-provider", "any-string").ok).toBe(true);
  });

  it("provider labels are human-readable", () => {
    expect(providerLabel("anthropic")).toBe("Anthropic");
    expect(providerLabel("openai")).toBe("OpenAI");
    expect(providerLabel("cartesia")).toBe("Cartesia");
  });

  it("console URLs map to provider dashboards", () => {
    expect(providerConsoleUrl("anthropic")).toBe("console.anthropic.com");
    expect(providerConsoleUrl("openai")).toBe(
      "platform.openai.com/api-keys"
    );
    expect(providerConsoleUrl("unknown")).toBeUndefined();
  });
});
