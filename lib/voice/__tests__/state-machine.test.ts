import { describe, expect, it } from "vitest";
import {
  currentStateKind,
  initialSession,
  sessionReducer,
  turnsForContext,
} from "../state-machine";

describe("sessionReducer — happy path R9 transitions", () => {
  it("listening → thinking captures listenEndAt", () => {
    const s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    expect(s.state.kind).toBe("listening");

    const t = sessionReducer(s, {
      type: "TRANSITION_THINKING",
      listenEndAt: 2000,
    });
    expect(t.state.kind).toBe("thinking");
    if (t.state.kind === "thinking") {
      expect(t.state.listenEndAt).toBe(2000);
    }
  });

  it("thinking → speaking captures latency (R9b)", () => {
    let s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    s = sessionReducer(s, {
      type: "TRANSITION_THINKING",
      listenEndAt: 2000,
    });
    s = sessionReducer(s, {
      type: "TRANSITION_SPEAKING",
      speechStartAt: 3200,
    });
    expect(s.state.kind).toBe("speaking");
    if (s.state.kind === "speaking") {
      expect(s.state.latencyMs).toBe(1200); // 3200 - 2000
    }
    expect(s.latencyMs).toEqual([1200]);
  });

  it("speaking → listening cycles cleanly", () => {
    let s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    s = sessionReducer(s, {
      type: "TRANSITION_THINKING",
      listenEndAt: 2000,
    });
    s = sessionReducer(s, {
      type: "TRANSITION_SPEAKING",
      speechStartAt: 3000,
    });
    s = sessionReducer(s, { type: "TRANSITION_LISTENING" });
    expect(s.state.kind).toBe("listening");
  });

  it("accumulates multiple latency measurements across turns", () => {
    let s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    // Turn 1
    s = sessionReducer(s, { type: "TRANSITION_THINKING", listenEndAt: 2000 });
    s = sessionReducer(s, { type: "TRANSITION_SPEAKING", speechStartAt: 3000 });
    s = sessionReducer(s, { type: "TRANSITION_LISTENING" });
    // Turn 2
    s = sessionReducer(s, { type: "TRANSITION_THINKING", listenEndAt: 5000 });
    s = sessionReducer(s, { type: "TRANSITION_SPEAKING", speechStartAt: 6500 });
    expect(s.latencyMs).toEqual([1000, 1500]);
  });

  it("out-of-order TRANSITION_SPEAKING is dropped", () => {
    const s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    // Skip thinking; speaking should be ignored
    const t = sessionReducer(s, {
      type: "TRANSITION_SPEAKING",
      speechStartAt: 2000,
    });
    expect(t.state.kind).toBe("listening");
    expect(t.latencyMs).toEqual([]);
  });
});

describe("sessionReducer — R9a error states", () => {
  it("mic-permission-denied transitions to error state", () => {
    const s = sessionReducer(initialSession, {
      type: "ERROR",
      kind: "mic-permission-denied",
      at: 1000,
    });
    expect(s.state.kind).toBe("mic-permission-denied");
  });

  it("network-drop sets retryAt with exponential backoff", () => {
    const s = sessionReducer(initialSession, {
      type: "ERROR",
      kind: "network-drop",
      at: 1000,
      attemptCount: 1,
    });
    expect(s.state.kind).toBe("network-drop");
    if (s.state.kind === "network-drop") {
      expect(s.state.retryAt).toBe(2000); // 1000 + 1000ms base
      expect(s.state.attemptCount).toBe(1);
    }
  });

  it("network-drop backoff escalates on subsequent attempts", () => {
    const s = sessionReducer(initialSession, {
      type: "ERROR",
      kind: "network-drop",
      at: 5000,
      attemptCount: 3,
    });
    if (s.state.kind === "network-drop") {
      // 1000 * 2^(3-1) = 4000ms backoff
      expect(s.state.retryAt).toBe(9000);
      expect(s.state.attemptCount).toBe(3);
    }
  });

  it("RECOVER_NETWORK from network-drop returns to listening", () => {
    let s = sessionReducer(initialSession, {
      type: "ERROR",
      kind: "network-drop",
      at: 1000,
    });
    s = sessionReducer(s, { type: "RECOVER_NETWORK", at: 2500 });
    expect(s.state.kind).toBe("listening");
  });

  it("RECOVER_NETWORK is a no-op when not in network-drop", () => {
    const s = sessionReducer(initialSession, {
      type: "RECOVER_NETWORK",
      at: 1000,
    });
    expect(s.state.kind).toBe("idle");
  });

  it("provider-timeout, asr-no-result, key-invalid each land in their own state", () => {
    expect(
      currentStateKind(
        sessionReducer(initialSession, {
          type: "ERROR",
          kind: "provider-timeout",
          at: 1000,
        })
      )
    ).toBe("provider-timeout");
    expect(
      currentStateKind(
        sessionReducer(initialSession, {
          type: "ERROR",
          kind: "asr-no-result",
          at: 1000,
        })
      )
    ).toBe("asr-no-result");
    expect(
      currentStateKind(
        sessionReducer(initialSession, {
          type: "ERROR",
          kind: "key-invalid",
          at: 1000,
        })
      )
    ).toBe("key-invalid");
  });
});

describe("sessionReducer — transcript handling", () => {
  it("TRANSCRIPT_PARTIAL appends a partial turn", () => {
    const s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_PARTIAL",
      id: "u1",
      speaker: "user",
      text: "Hello",
      at: 1000,
    });
    expect(s.turns).toHaveLength(1);
    expect(s.turns[0].partial).toBe(true);
    expect(s.turns[0].text).toBe("Hello");
  });

  it("subsequent TRANSCRIPT_PARTIAL with same id replaces the turn text", () => {
    let s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_PARTIAL",
      id: "u1",
      speaker: "user",
      text: "Hel",
      at: 1000,
    });
    s = sessionReducer(s, {
      type: "TRANSCRIPT_PARTIAL",
      id: "u1",
      speaker: "user",
      text: "Hello world",
      at: 1200,
    });
    expect(s.turns).toHaveLength(1);
    expect(s.turns[0].text).toBe("Hello world");
    expect(s.turns[0].partial).toBe(true);
  });

  it("TRANSCRIPT_FINAL finalizes an existing partial", () => {
    let s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_PARTIAL",
      id: "u1",
      speaker: "user",
      text: "Hello",
      at: 1000,
    });
    s = sessionReducer(s, {
      type: "TRANSCRIPT_FINAL",
      id: "u1",
      speaker: "user",
      text: "Hello world.",
      at: 1500,
    });
    expect(s.turns).toHaveLength(1);
    expect(s.turns[0].text).toBe("Hello world.");
    expect(s.turns[0].partial).toBe(false);
  });

  it("STRIKE_TURN toggles the stricken flag (R11)", () => {
    let s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_FINAL",
      id: "u1",
      speaker: "user",
      text: "Loose research",
      at: 1000,
    });
    expect(s.turns[0].stricken).toBe(false);
    s = sessionReducer(s, { type: "STRIKE_TURN", id: "u1" });
    expect(s.turns[0].stricken).toBe(true);
    // Striking again unstrikes
    s = sessionReducer(s, { type: "STRIKE_TURN", id: "u1" });
    expect(s.turns[0].stricken).toBe(false);
  });

  it("turnsForContext excludes stricken and partial turns", () => {
    let s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_FINAL",
      id: "u1",
      speaker: "user",
      text: "User research",
      at: 1000,
    });
    s = sessionReducer(s, {
      type: "TRANSCRIPT_FINAL",
      id: "u2",
      speaker: "user",
      text: "Loose research",
      at: 2000,
    });
    s = sessionReducer(s, {
      type: "TRANSCRIPT_PARTIAL",
      id: "u3",
      speaker: "user",
      text: "still typing",
      at: 3000,
    });
    s = sessionReducer(s, { type: "STRIKE_TURN", id: "u2" });

    const context = turnsForContext(s);
    expect(context).toHaveLength(1);
    expect(context[0].text).toBe("User research");
  });
});

describe("sessionReducer — scratchpad (R8 collapse + content)", () => {
  it("SCRATCHPAD_UPDATE stores text", () => {
    const s = sessionReducer(initialSession, {
      type: "SCRATCHPAD_UPDATE",
      text: "Users: 65+, smartphone-comfortable",
    });
    expect(s.scratchpad).toBe("Users: 65+, smartphone-comfortable");
  });

  it("SCRATCHPAD_COLLAPSE toggles the collapsed flag (R8)", () => {
    let s = sessionReducer(initialSession, {
      type: "SCRATCHPAD_COLLAPSE",
      collapsed: true,
    });
    expect(s.scratchpadCollapsed).toBe(true);
    s = sessionReducer(s, { type: "SCRATCHPAD_COLLAPSE", collapsed: false });
    expect(s.scratchpadCollapsed).toBe(false);
  });
});

describe("sessionReducer — lifecycle", () => {
  it("START_SESSION resets prior state and enters listening", () => {
    let s = sessionReducer(initialSession, {
      type: "TRANSCRIPT_FINAL",
      id: "u1",
      speaker: "user",
      text: "leftover",
      at: 1000,
    });
    s = sessionReducer(s, { type: "START_SESSION", at: 5000 });
    expect(s.state.kind).toBe("listening");
    expect(s.turns).toEqual([]);
    expect(s.startedAt).toBe(5000);
  });

  it("END_SESSION transitions to idle and records endedAt", () => {
    let s = sessionReducer(initialSession, {
      type: "START_SESSION",
      at: 1000,
    });
    s = sessionReducer(s, { type: "END_SESSION", at: 30_000 });
    expect(s.state.kind).toBe("idle");
    expect(s.endedAt).toBe(30_000);
  });
});
