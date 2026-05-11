import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileGate } from "../mobile-gate";

describe("MobileGate (R12 + AE7)", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it("renders the gate copy and brand", () => {
    render(<MobileGate />);
    expect(screen.getByTestId("mobile-gate")).toBeInTheDocument();
    expect(screen.getByText(/Mockingbird is built for desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/Open this link on a laptop/i)).toBeInTheDocument();
  });

  it("AE7: clicking 'Copy link' writes the current URL to the clipboard", async () => {
    render(<MobileGate />);
    const copyButton = screen.getByRole("button", { name: /Copy link/i });
    await userEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Link copied/i)).toBeInTheDocument();
    });
  });

  it("is hidden at lg+ breakpoint via lg:hidden Tailwind class", () => {
    render(<MobileGate />);
    const gate = screen.getByTestId("mobile-gate");
    expect(gate.className).toContain("lg:hidden");
  });
});
