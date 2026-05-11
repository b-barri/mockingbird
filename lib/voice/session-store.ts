"use client";

import type { SessionCostAccumulator } from "@/lib/telemetry/cost-tracker";
import type { Turn } from "./state-machine";

// Completed session storage. Session data is client-only at V1 — no DB.
// On session end, the three-panel page writes the snapshot to sessionStorage
// under a fresh UUID, then navigates to /session/summary/[id]. The summary
// page reads by id. Persistence is tab-lifetime only.

const PREFIX = "mockingbird:session:";

export interface CompletedSession {
  caseId: string;
  turns: Turn[];
  scratchpad: string;
  startedAt: number;
  endedAt: number;
  /** Per-turn latencyMs[] from the state machine (R9b). */
  latencyMs: number[];
  costSnapshot: SessionCostAccumulator;
}

export function saveCompletedSession(s: CompletedSession): string {
  if (typeof window === "undefined") {
    throw new Error("saveCompletedSession requires a browser context.");
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  window.sessionStorage.setItem(`${PREFIX}${id}`, JSON.stringify(s));
  return id;
}

export function loadCompletedSession(id: string): CompletedSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`${PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompletedSession;
  } catch {
    return null;
  }
}

export function clearCompletedSession(id: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`${PREFIX}${id}`);
}

/** Format a duration in ms as MM:SS. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
