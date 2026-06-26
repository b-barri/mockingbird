import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThreePanel } from "../three-panel";
import {
  initialSession,
  sessionReducer,
  type SessionSnapshot,
} from "@/lib/voice/state-machine";

function buildSession(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return { ...initialSession, ...overrides };
}

describe("ThreePanel — R7 + R8 layout", () => {
  it("renders all three panels when scratchpad is expanded (default)", () => {
    const session = buildSession({
      state: { kind: "listening" },
      startedAt: Date.now() - 60_000,
    });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="Design a meditation app"
      />
    );
    expect(screen.getByTestId("transcript-panel")).toBeInTheDocument();
    expect(screen.getByTestId("voice-stage")).toBeInTheDocument();
    expect(screen.getByTestId("scratchpad-panel")).toBeInTheDocument();
  });

  it("AE5: collapsing the scratchpad switches grid to 2:3 (40% transcript, 60% voice)", () => {
    const session = buildSession({
      state: { kind: "listening" },
      scratchpadCollapsed: true,
    });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="Design a meditation app"
      />
    );
    const grid = screen.getByTestId("three-panel-grid");
    expect(grid).toHaveAttribute("data-scratchpad-collapsed", "true");
    // Tailwind class for collapsed: grid-cols-[2fr_3fr]
    expect(grid.className).toMatch(/grid-cols-\[2fr_3fr\]/);
    // Scratchpad section is not rendered when collapsed
    expect(screen.queryByTestId("scratchpad-panel")).toBeNull();
  });

  it("expanded scratchpad uses the 35/30/35 column layout", () => {
    const session = buildSession({
      state: { kind: "listening" },
      scratchpadCollapsed: false,
    });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="Design a meditation app"
      />
    );
    const grid = screen.getByTestId("three-panel-grid");
    expect(grid.className).toMatch(/grid-cols-\[1fr_1\.1fr_1\.2fr\]/);
  });

  it("renders the case title in the top bar", () => {
    const session = buildSession({ state: { kind: "listening" } });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="Design a meditation app for elderly users"
      />
    );
    expect(
      screen.getByText(/Design a meditation app for elderly users/)
    ).toBeInTheDocument();
  });

  it("dispatches END_SESSION isn't fired automatically; onEndSession routes it", async () => {
    const onEnd = vi.fn();
    const session = buildSession({ state: { kind: "listening" } });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="x"
        onEndSession={onEnd}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /End session/i }));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("clicking the scratchpad Collapse button dispatches SCRATCHPAD_COLLAPSE", async () => {
    const dispatch = vi.fn();
    const session = buildSession({
      state: { kind: "listening" },
      scratchpadCollapsed: false,
    });
    render(
      <ThreePanel
        session={session}
        dispatch={dispatch}
        caseTitle="x"
      />
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Collapse scratchpad/i })
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "SCRATCHPAD_COLLAPSE",
      collapsed: true,
    });
  });

  it("after collapse, an expand-floating-button appears", () => {
    const session = buildSession({
      state: { kind: "listening" },
      scratchpadCollapsed: true,
    });
    render(
      <ThreePanel
        session={session}
        dispatch={() => {}}
        caseTitle="x"
      />
    );
    expect(
      screen.getByRole("button", { name: /Show scratchpad/i })
    ).toBeInTheDocument();
  });

  describe("Pause toggle (timer-only)", () => {
    it("button is disabled before the session has started", () => {
      const session = buildSession(); // state.kind === 'idle', no startedAt
      render(
        <ThreePanel session={session} dispatch={() => {}} caseTitle="x" />
      );
      const button = screen.getByTestId("pause-toggle");
      expect(button).toBeDisabled();
    });

    it("toggling flips the label between Pause and Resume", async () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel session={session} dispatch={() => {}} caseTitle="x" />
      );
      const button = screen.getByTestId("pause-toggle");
      expect(button).toHaveTextContent(/Pause/i);
      expect(button).toHaveAttribute("data-paused", "false");
      await userEvent.click(button);
      expect(button).toHaveTextContent(/Resume/i);
      expect(button).toHaveAttribute("data-paused", "true");
      await userEvent.click(button);
      expect(button).toHaveTextContent(/Pause/i);
      expect(button).toHaveAttribute("data-paused", "false");
    });

    it("hides the input affordance while paused (listening state)", async () => {
      const onSubmitTurn = vi.fn();
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={onSubmitTurn}
        />
      );
      // Text input visible before pause
      expect(screen.getByTestId("turn-input")).toBeInTheDocument();
      await userEvent.click(screen.getByTestId("pause-toggle"));
      // Text input gone, paused copy visible (header status + voice stage both
      // now reflect the paused state, so more than one match is expected).
      expect(screen.queryByTestId("turn-input")).toBeNull();
      expect(screen.getAllByText(/Paused/i).length).toBeGreaterThanOrEqual(1);
    });

  });

  describe("Input-mode segmented pill toggle", () => {
    it("renders both pill options when onToggleInputMode is provided", () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={() => {}}
          inputMode="text"
          onToggleInputMode={() => {}}
        />
      );
      expect(screen.getByTestId("toggle-input-mode")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-voice")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-text")).toBeInTheDocument();
    });

    it("marks the active option with aria-pressed=true and the other with false", () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      const { rerender } = render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onVoiceBlob={() => {}}
          inputMode="voice"
          onToggleInputMode={() => {}}
        />
      );
      expect(screen.getByTestId("toggle-voice")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByTestId("toggle-text")).toHaveAttribute(
        "aria-pressed",
        "false"
      );
      rerender(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={() => {}}
          inputMode="text"
          onToggleInputMode={() => {}}
        />
      );
      expect(screen.getByTestId("toggle-voice")).toHaveAttribute(
        "aria-pressed",
        "false"
      );
      expect(screen.getByTestId("toggle-text")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("clicking the inactive option fires onToggleInputMode; clicking active is a no-op", async () => {
      const onToggleInputMode = vi.fn();
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={() => {}}
          inputMode="text"
          onToggleInputMode={onToggleInputMode}
        />
      );
      // Clicking the currently-active option (text) does nothing
      await userEvent.click(screen.getByTestId("toggle-text"));
      expect(onToggleInputMode).not.toHaveBeenCalled();
      // Clicking the inactive option (voice) fires the callback
      await userEvent.click(screen.getByTestId("toggle-voice"));
      expect(onToggleInputMode).toHaveBeenCalledTimes(1);
    });

    it("hides the toggle when onToggleInputMode is undefined (text-only candidate)", () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={() => {}}
          inputMode="text"
        />
      );
      expect(screen.queryByTestId("toggle-input-mode")).toBeNull();
    });

    it("remains visible during pause — switching is a settings change for the next turn", async () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          onSubmitTurn={() => {}}
          inputMode="text"
          onToggleInputMode={() => {}}
        />
      );
      expect(screen.getByTestId("toggle-input-mode")).toBeInTheDocument();
      await userEvent.click(screen.getByTestId("pause-toggle"));
      // Pill stays visible even while paused.
      expect(screen.getByTestId("toggle-input-mode")).toBeInTheDocument();
    });

    it("renders at the top of the voice stage (above the question card)", () => {
      const session = buildSession({
        state: { kind: "listening" },
        startedAt: Date.now() - 5_000,
      });
      render(
        <ThreePanel
          session={session}
          dispatch={() => {}}
          caseTitle="x"
          currentQuestion="What's your initial frame?"
          onSubmitTurn={() => {}}
          inputMode="text"
          onToggleInputMode={() => {}}
        />
      );
      const stage = screen.getByTestId("voice-stage");
      const toggle = screen.getByTestId("toggle-input-mode");
      const question = screen.getByText(/What's your initial frame/);
      // Both elements are inside the voice stage
      expect(stage).toContainElement(toggle);
      expect(stage).toContainElement(question);
      // Toggle DOM-position-precedes the question card
      const stageChildren = Array.from(stage.querySelectorAll("*"));
      expect(stageChildren.indexOf(toggle)).toBeLessThan(
        stageChildren.indexOf(question)
      );
    });
  });

  it("session reducer integration: strike + scratchpad update produce expected state", () => {
    let s = sessionReducer(initialSession, { type: "START_SESSION", at: 0 });
    s = sessionReducer(s, {
      type: "TRANSCRIPT_FINAL",
      id: "u1",
      speaker: "user",
      text: "Loose research",
      at: 100,
    });
    s = sessionReducer(s, { type: "STRIKE_TURN", id: "u1" });
    s = sessionReducer(s, {
      type: "SCRATCHPAD_UPDATE",
      text: "User: 65+",
    });
    expect(s.turns[0].stricken).toBe(true);
    expect(s.scratchpad).toBe("User: 65+");
  });
});
