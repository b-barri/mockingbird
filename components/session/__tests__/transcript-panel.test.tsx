import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TranscriptPanel } from "../transcript-panel";
import type { Turn } from "@/lib/voice/state-machine";

function makeTurn(overrides: Partial<Turn> = {}): Turn {
  return {
    id: "t1",
    speaker: "user",
    text: "User research is the core",
    timestamp: Date.now(),
    partial: false,
    stricken: false,
    ...overrides,
  };
}

describe("TranscriptPanel", () => {
  it("renders empty-state copy when turns is empty", () => {
    render(<TranscriptPanel turns={[]} onStrikeTurn={() => {}} />);
    expect(screen.getByText(/Conversation will appear here/i)).toBeInTheDocument();
  });

  it("renders user and interviewer turns with correct labels", () => {
    const turns: Turn[] = [
      makeTurn({ id: "ai-1", speaker: "ai", text: "Who are we designing for?" }),
      makeTurn({ id: "u-1", speaker: "user", text: "Elderly users." }),
    ];
    render(<TranscriptPanel turns={turns} onStrikeTurn={() => {}} />);
    expect(screen.getByText(/Interviewer/i)).toBeInTheDocument();
    expect(screen.getByText(/^You$/i)).toBeInTheDocument();
    expect(screen.getByText(/Who are we designing for/)).toBeInTheDocument();
    expect(screen.getByText(/Elderly users\./)).toBeInTheDocument();
  });

  it("AE4: clicking the strike button on a turn fires onStrikeTurn with the id", async () => {
    const onStrike = vi.fn();
    const turns: Turn[] = [
      makeTurn({ id: "u-1", text: "Loose research is the core" }),
    ];
    render(<TranscriptPanel turns={turns} onStrikeTurn={onStrike} />);
    const strikeButton = screen.getByRole("button", {
      name: /Strike out this turn/i,
    });
    await userEvent.click(strikeButton);
    expect(onStrike).toHaveBeenCalledWith("u-1");
  });

  it("renders stricken turns with line-through styling and a restore affordance", () => {
    const turns: Turn[] = [makeTurn({ id: "u-1", stricken: true })];
    render(<TranscriptPanel turns={turns} onStrikeTurn={() => {}} />);
    const turn = screen.getByTestId("turn-u-1");
    expect(turn).toHaveAttribute("data-stricken", "true");
    expect(
      screen.getByRole("button", { name: /Restore turn/i })
    ).toBeInTheDocument();
  });

  it("renders partial turns with a 'typing…' indicator", () => {
    const turns: Turn[] = [makeTurn({ partial: true })];
    render(<TranscriptPanel turns={turns} onStrikeTurn={() => {}} />);
    expect(screen.getByText(/typing/i)).toBeInTheDocument();
  });
});
