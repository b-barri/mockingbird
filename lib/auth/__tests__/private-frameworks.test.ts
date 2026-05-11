/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock 'server-only' since vitest runs outside Next.js's build-time guard.
vi.mock("server-only", () => ({}));

import { PUBLIC_FRAMEWORKS } from "@/lib/llm/prompts/framework-library";

describe("getActiveFrameworks (R21)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPERATOR_SECRET;
    delete process.env.OPERATOR_PRIVATE_FRAMEWORKS;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function importFresh() {
    // Re-import the module each test so it reads the current env.
    return import("../private-frameworks");
  }

  it("returns PUBLIC_FRAMEWORKS when no operator token is provided", async () => {
    const { getActiveFrameworks } = await importFresh();
    expect(getActiveFrameworks(null)).toEqual(PUBLIC_FRAMEWORKS);
  });

  it("returns PUBLIC_FRAMEWORKS when OPERATOR_SECRET is unset", async () => {
    const { getActiveFrameworks } = await importFresh();
    // Token provided but no secret to match against → reject
    expect(getActiveFrameworks("any-token")).toEqual(PUBLIC_FRAMEWORKS);
  });

  it("returns PUBLIC_FRAMEWORKS when token does not match the secret", async () => {
    process.env.OPERATOR_SECRET = "the-real-secret";
    const { getActiveFrameworks } = await importFresh();
    expect(getActiveFrameworks("wrong-token")).toEqual(PUBLIC_FRAMEWORKS);
  });

  it("returns private library when token + secret + env-var all match", async () => {
    process.env.OPERATOR_SECRET = "the-real-secret";
    process.env.OPERATOR_PRIVATE_FRAMEWORKS = JSON.stringify([
      {
        name: "Bhavya's CIRCLES+",
        expansion: "Customer · Insight · Report · Cut · List · Eval · Summary · Competitive",
        bestFor: "PD with competitive context.",
        steps: [
          {
            id: "C",
            name: "Customer",
            purpose: "Who exactly for, including segments.",
            probe: "Who specifically — name 1-2 personas?",
          },
        ],
      },
    ]);
    const { getActiveFrameworks } = await importFresh();
    const result = getActiveFrameworks("the-real-secret");
    expect(result[0].name).toBe("Bhavya's CIRCLES+");
    expect(result).not.toEqual(PUBLIC_FRAMEWORKS);
  });

  it("falls back to PUBLIC_FRAMEWORKS when private library env-var is malformed JSON", async () => {
    process.env.OPERATOR_SECRET = "the-real-secret";
    process.env.OPERATOR_PRIVATE_FRAMEWORKS = "{not valid json";
    const { getActiveFrameworks } = await importFresh();
    expect(getActiveFrameworks("the-real-secret")).toEqual(PUBLIC_FRAMEWORKS);
  });

  it("falls back to PUBLIC_FRAMEWORKS when private library is empty array", async () => {
    process.env.OPERATOR_SECRET = "the-real-secret";
    process.env.OPERATOR_PRIVATE_FRAMEWORKS = "[]";
    const { getActiveFrameworks } = await importFresh();
    expect(getActiveFrameworks("the-real-secret")).toEqual(PUBLIC_FRAMEWORKS);
  });

  it("rejects empty-string token even when secret is set", async () => {
    process.env.OPERATOR_SECRET = "the-real-secret";
    const { getActiveFrameworks } = await importFresh();
    expect(getActiveFrameworks("")).toEqual(PUBLIC_FRAMEWORKS);
  });
});
