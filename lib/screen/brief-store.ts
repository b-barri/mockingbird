"use client";

import type { Brief } from "@/lib/screen/brief";

// Client-side brief storage (sessionStorage), mirroring lib/voice/session-store.
//
// For the no-telephony slice, the brief only needs to travel from the research
// step to the brief-display page in the same tab — exactly the existing
// client-only session pattern. The server-side store (U5, deferred) is needed
// only to bridge the async call→webhook gap once telephony lands; it does not
// replace this for the pre-call display.

const PREFIX = "mockingbird:brief:";

export function saveBrief(brief: Brief): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${PREFIX}${brief.id}`, JSON.stringify(brief));
}

export function loadBrief(id: string): Brief | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`${PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    return null;
  }
}
