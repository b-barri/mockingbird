"use client";

// R6 + R6b: BYO API key storage. sessionStorage default (tab-lifetime only)
// with opt-in localStorage for cross-reload persistence (AE3 — keys stick
// across mid-session reload).
//
// V1 stores keys as plain strings; the security posture is CSP + SRI per
// R6b, not client-side encryption (which offers marginal benefit when the
// encryption key is also in JS). The CSP header is set globally in
// next.config.ts; an opt-in to localStorage assumes that CSP is in place.

import type { ProviderName } from "@/lib/voice";

export type KeyProvider =
  | "llm" // Anthropic or OpenAI (per Key Technical Decision)
  | ProviderName; // cartesia, sarvam, elevenlabs

const PREFIX = "mockingbird:key:";
const REMEMBER_FLAG = "mockingbird:remember";

function storageKey(provider: KeyProvider): string {
  return `${PREFIX}${provider}`;
}

function activeStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Key storage is only available in the browser.");
  }
  const remember = window.localStorage.getItem(REMEMBER_FLAG) === "1";
  return remember ? window.localStorage : window.sessionStorage;
}

/** Read a provider's key from active storage. */
export function getKey(provider: KeyProvider): string | null {
  if (typeof window === "undefined") return null;
  // Check both storages — opt-in toggle may have changed across sessions
  return (
    window.sessionStorage.getItem(storageKey(provider)) ||
    window.localStorage.getItem(storageKey(provider))
  );
}

/** Write a provider's key to active storage. */
export function setKey(
  provider: KeyProvider,
  value: string,
  options: { remember?: boolean } = {}
): void {
  if (typeof window === "undefined") return;
  const remember = options.remember ?? false;
  // Persist the remember flag so subsequent reads pick the right storage
  if (remember) {
    window.localStorage.setItem(REMEMBER_FLAG, "1");
  } else {
    window.localStorage.removeItem(REMEMBER_FLAG);
  }
  const storage = activeStorage();
  storage.setItem(storageKey(provider), value);
  // Clear the other storage so we don't end up with stale dual-stored keys
  const otherStorage =
    storage === window.sessionStorage
      ? window.localStorage
      : window.sessionStorage;
  otherStorage.removeItem(storageKey(provider));
}

/** Remove a provider's key from both storages. */
export function clearKey(provider: KeyProvider): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(provider));
  window.localStorage.removeItem(storageKey(provider));
}

/** Whether a key is configured for this provider. */
export function hasKey(provider: KeyProvider): boolean {
  return getKey(provider) !== null;
}

/** Whether the user has opted into cross-reload persistence. */
export function isRememberingKeys(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REMEMBER_FLAG) === "1";
}

/** Clear all keys from both storages (used when leaving the product). */
export function clearAllKeys(): void {
  if (typeof window === "undefined") return;
  ["llm", "cartesia", "sarvam", "elevenlabs"].forEach((p) => {
    window.sessionStorage.removeItem(`${PREFIX}${p}`);
    window.localStorage.removeItem(`${PREFIX}${p}`);
  });
  window.localStorage.removeItem(REMEMBER_FLAG);
}
