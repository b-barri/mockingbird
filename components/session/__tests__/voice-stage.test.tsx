import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceStage } from "../voice-stage";

describe("VoiceStage — happy paths (R9, AE1)", () => {
  it("renders listening state with status text", () => {
    render(<VoiceStage state="listening" />);
    expect(screen.getByTestId("voice-stage")).toHaveAttribute(
      "data-state",
      "listening"
    );
    expect(screen.getByText(/Listening/i)).toBeInTheDocument();
  });

  it("AE1: both orb data-state and status text say 'thinking' simultaneously", () => {
    render(<VoiceStage state="thinking" />);
    const stage = screen.getByTestId("voice-stage");
    expect(stage).toHaveAttribute("data-state", "thinking");
    const orb = screen.getByTestId("voice-orb");
    expect(orb).toHaveAttribute("data-state", "thinking");
    // Status label shows "Thinking"
    expect(screen.getByText(/Thinking/i)).toBeInTheDocument();
  });

  it("renders the current-question card when provided", () => {
    render(
      <VoiceStage
        state="listening"
        currentQuestion="Why decision fatigue specifically?"
      />
    );
    expect(
      screen.getByText(/Why decision fatigue specifically\?/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Currently asking/i)).toBeInTheDocument();
  });
});

describe("VoiceStage — R9a error states (AE6)", () => {
  it("AE6: key-invalid renders full-panel error with CTA to onboarding", async () => {
    const onErrorAction = vi.fn();
    render(<VoiceStage state="key-invalid" onErrorAction={onErrorAction} />);
    expect(screen.getByTestId("voice-stage-error")).toHaveAttribute(
      "data-state",
      "key-invalid"
    );
    expect(screen.getByText(/API key invalid/i)).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /Return to onboarding/i });
    expect(cta).toBeInTheDocument();
    await userEvent.click(cta);
    expect(onErrorAction).toHaveBeenCalledOnce();
  });

  it("mic-permission-denied surfaces the grant-access affordance", () => {
    render(<VoiceStage state="mic-permission-denied" />);
    expect(screen.getByText(/Microphone access needed/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Grant microphone access/i })
    ).toBeInTheDocument();
  });

  it("network-drop shows the reconnecting status", () => {
    render(<VoiceStage state="network-drop" />);
    expect(screen.getByText(/Connection lost — reconnecting/i)).toBeInTheDocument();
    // "Reconnecting" appears in both the body and the label; allOf is fine.
    expect(screen.getAllByText(/Reconnecting/i).length).toBeGreaterThanOrEqual(1);
  });

  it("provider-timeout offers a retry affordance", () => {
    render(<VoiceStage state="provider-timeout" />);
    expect(
      screen.getByText(/Taking longer than usual/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Retry/i })
    ).toBeInTheDocument();
  });
});
