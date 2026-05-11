import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Orb } from "../orb";
import type { VoiceStateKind } from "@/lib/voice/types";

describe("Orb", () => {
  const cases: VoiceStateKind[] = [
    "idle",
    "listening",
    "thinking",
    "speaking",
    "mic-permission-denied",
    "network-drop",
    "asr-no-result",
    "key-invalid",
    "provider-timeout",
  ];

  it.each(cases)("renders with data-state=%s", (state) => {
    render(<Orb state={state} />);
    const orb = screen.getByTestId("voice-orb");
    expect(orb).toHaveAttribute("data-state", state);
  });

  it("applies the pulse animation class for active states", () => {
    const { container } = render(<Orb state="listening" />);
    expect(container.querySelector(".animate-orb-pulse")).not.toBeNull();
  });

  it("applies the ring-expand animation only for listening/speaking", () => {
    const { container, rerender } = render(<Orb state="listening" />);
    expect(
      container.querySelectorAll(".animate-ring-expand").length
    ).toBeGreaterThan(0);
    rerender(<Orb state="thinking" />);
    expect(
      container.querySelectorAll(".animate-ring-expand").length
    ).toBe(0);
  });

  it("renders a greyed-out variant for error states", () => {
    const { container } = render(<Orb state="key-invalid" />);
    // Error variant uses opacity-50 modifier
    expect(container.querySelector(".opacity-50")).not.toBeNull();
  });
});
