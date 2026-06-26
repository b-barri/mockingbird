import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SummaryCard } from "../summary-card";
import type { StructuredFeedback } from "@/lib/llm/summary";

const baseProps = {
  caseTitle: "Design a meditation app for elderly users",
  duration: "29:42",
  spend: "$0.085",
  sessionId: "abc-1234-5678-9012",
};

const sampleFeedback: StructuredFeedback = {
  dimensions: [
    {
      name: "Customer focus",
      verdict: "strong",
      observation: "Named teens 14-17 sharply, anchored the rest.",
    },
    {
      name: "Structure",
      verdict: "strong",
      observation: "Moved user → needs → solutions cleanly.",
    },
    {
      name: "Engagement side",
      verdict: "strong",
      observation: "Named multiple specific levers with rationale.",
    },
    {
      name: "Harm side",
      verdict: "missing",
      observation: "Comparison anxiety, body image, sleep — never reached.",
    },
  ],
  whatWorked:
    "In framing the customer, you sharply named teens 14-17 as your target — that anchored the rest of your answer. Your prioritization of engagement levers was concrete and actionable.",
  whatMissed:
    "You missed the harm side of the case's engagement-vs-harm tension entirely. A stronger answer would have led with 'who could this hurt and how' before optimizing engagement levers.",
};

describe("SummaryCard (R16a — required elements)", () => {
  it("renders case title in the header", () => {
    render(
      <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
    );
    expect(screen.getByText(baseProps.caseTitle)).toBeInTheDocument();
  });

  it("(g) loading state shows skeleton + generating copy", () => {
    render(<SummaryCard {...baseProps} loading={true} />);
    expect(screen.getByTestId("summary-loading")).toBeInTheDocument();
    expect(screen.getByText(/Generating summary/i)).toBeInTheDocument();
  });

  it("(h) error state shows fallback copy and the error text", () => {
    render(
      <SummaryCard
        {...baseProps}
        loading={false}
        error="LLM 502 from upstream"
      />
    );
    expect(screen.getByTestId("summary-error")).toBeInTheDocument();
    expect(
      screen.getByText(/Summary unavailable\. Your transcript is still saved/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/LLM 502/i)).toBeInTheDocument();
  });

  it("(c) duration and (e) spend appear in the stats row", () => {
    render(
      <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
    );
    expect(screen.getByText("29:42")).toBeInTheDocument();
    expect(screen.getByText("$0.085")).toBeInTheDocument();
    expect(screen.getByText(/charged to your provider/i)).toBeInTheDocument();
  });

  it("(f) renders 'Start another session' CTA pointing to case-select", () => {
    render(
      <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
    );
    const cta = screen.getByRole("link", { name: /Start another session/i });
    expect(cta).toHaveAttribute("href", "/onboarding/case-select");
  });

  it("(d) renders the transcript view button when handler provided", () => {
    const onViewTranscript = vi.fn();
    render(
      <SummaryCard
        {...baseProps}
        loading={false}
        feedback={sampleFeedback}
        onViewTranscript={onViewTranscript}
      />
    );
    expect(screen.getByTestId("view-transcript")).toBeInTheDocument();
  });

  it("session id is truncated to 8 chars + ellipsis for display", () => {
    render(
      <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
    );
    expect(screen.getByText(/abc-1234…/)).toBeInTheDocument();
  });

  describe("Dimension cards", () => {
    it("renders exactly 4 dimension cards", () => {
      render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      const cards = screen.getAllByTestId("dimension-card");
      expect(cards).toHaveLength(4);
    });

    it("each card shows the dimension name, verdict label, and observation", () => {
      render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      expect(screen.getByText("Customer focus")).toBeInTheDocument();
      expect(screen.getByText("Harm side")).toBeInTheDocument();
      expect(
        screen.getByText(/Comparison anxiety, body image/i)
      ).toBeInTheDocument();
      // Every verdict label appears at least once
      expect(screen.getAllByText(/strong/).length).toBeGreaterThan(0);
      expect(screen.getByText(/missing/)).toBeInTheDocument();
    });

    it("encodes the verdict on each card via data-verdict for styling/automation", () => {
      render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      const cards = screen.getAllByTestId("dimension-card");
      const verdicts = cards.map((c) => c.getAttribute("data-verdict"));
      expect(verdicts).toEqual(["strong", "strong", "strong", "missing"]);
    });

    it("does NOT render numeric scores or star ratings in any card", () => {
      const { container } = render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      const grid = container.querySelector('[data-testid="dimension-grid"]');
      expect(grid).not.toBeNull();
      // No digits-followed-by-slash-and-digit (e.g., 4/5), no stars, no percent
      expect(grid!.textContent).not.toMatch(/\d\s*\/\s*\d/);
      expect(grid!.textContent).not.toMatch(/★/);
      expect(grid!.textContent).not.toMatch(/%/);
    });
  });

  describe("Prose narratives", () => {
    it("renders 'What worked' and 'What was missed' sections with their text", () => {
      render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      expect(screen.getByText(/What worked/i)).toBeInTheDocument();
      expect(
        screen.getByText(/What was missed and could have been better/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId("what-worked").textContent).toContain(
        "teens 14-17"
      );
      expect(screen.getByTestId("what-missed").textContent).toContain(
        "harm side"
      );
    });
  });

  describe("Copy-to-clipboard", () => {
    const originalClipboard = navigator.clipboard;

    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    afterEach(() => {
      Object.assign(navigator, { clipboard: originalClipboard });
    });

    it("formats the feedback as readable text and copies it", async () => {
      render(
        <SummaryCard {...baseProps} loading={false} feedback={sampleFeedback} />
      );
      const copyButton = screen.getByRole("button", { name: /Copy summary/i });
      await userEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>)
        .mock.calls[0][0] as string;
      // Verdict uppercased
      expect(copied).toContain("STRONG");
      expect(copied).toContain("MISSING");
      // Section headers
      expect(copied).toContain("What worked:");
      expect(copied).toContain("What was missed:");
      // Dimension content
      expect(copied).toContain("Customer focus");
      expect(copied).toContain("Harm side");
      await waitFor(() => {
        expect(screen.getByText(/Copied/i)).toBeInTheDocument();
      });
    });
  });
});
