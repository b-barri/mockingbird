/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAllKeys,
  clearKey,
  getKey,
  hasKey,
  isRememberingKeys,
  setKey,
} from "../key-storage";

describe("key-storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    clearAllKeys();
  });

  it("setKey + getKey roundtrip with sessionStorage default", () => {
    setKey("llm", "sk-ant-abc");
    expect(getKey("llm")).toBe("sk-ant-abc");
    expect(window.sessionStorage.getItem("mockingbird:key:llm")).toBe("sk-ant-abc");
    expect(window.localStorage.getItem("mockingbird:key:llm")).toBeNull();
  });

  it("opt-in localStorage persists across simulated reload (AE3)", () => {
    setKey("llm", "sk-ant-abc", { remember: true });
    expect(window.localStorage.getItem("mockingbird:key:llm")).toBe("sk-ant-abc");
    expect(isRememberingKeys()).toBe(true);
  });

  it("hasKey reflects current storage state", () => {
    expect(hasKey("llm")).toBe(false);
    setKey("llm", "sk-ant-abc");
    expect(hasKey("llm")).toBe(true);
  });

  it("toggling remember off clears the localStorage entry on next write", () => {
    setKey("llm", "sk-ant-abc", { remember: true });
    expect(window.localStorage.getItem("mockingbird:key:llm")).toBe("sk-ant-abc");
    setKey("llm", "sk-ant-xyz", { remember: false });
    // localStorage cleared, sessionStorage populated
    expect(window.localStorage.getItem("mockingbird:key:llm")).toBeNull();
    expect(window.sessionStorage.getItem("mockingbird:key:llm")).toBe("sk-ant-xyz");
  });

  it("clearKey removes from both storages", () => {
    setKey("llm", "sk-ant-abc", { remember: true });
    setKey("cartesia", "ct-abc");
    clearKey("llm");
    expect(getKey("llm")).toBeNull();
    expect(getKey("cartesia")).toBe("ct-abc");
  });

  it("clearAllKeys wipes both storages and the remember flag", () => {
    setKey("llm", "sk-ant-abc", { remember: true });
    setKey("cartesia", "ct-abc");
    clearAllKeys();
    expect(getKey("llm")).toBeNull();
    expect(getKey("cartesia")).toBeNull();
    expect(isRememberingKeys()).toBe(false);
  });

  it("getKey checks both storages so stale localStorage values are still found", () => {
    window.localStorage.setItem("mockingbird:key:llm", "leftover");
    expect(getKey("llm")).toBe("leftover");
  });
});
