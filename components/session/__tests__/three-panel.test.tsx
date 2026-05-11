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
