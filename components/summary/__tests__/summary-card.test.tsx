import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SummaryCard } from "../summary-card";

const baseProps = {
  caseTitle: "Design a meditation app for elderly users",
  duration: "29:42",
  spend: "$0.085",
  sessionId: "abc-1234-5678-9012",
};

describe("SummaryCard (R16a — 8 required elements)", () => {
  it("renders case title in the header", () => {
    render(<SummaryCard {...baseProps} loading={false} summaryText="..." />);
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
      screen.getByText(/Summary unavailable — your transcript is still saved/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/LLM 502/i)).toBeInTheDocument();
  });

  it("(a) renders the summary paragraph when generation completes", () => {
    render(
      <SummaryCard
        {...baseProps}
        loading={false}
        summaryText="The candidate moved logically from user to needs but skipped the cut-down step before solutions. Strongest moment was the decision-fatigue insight."
      />
    );
    expect(
      screen.getByText(/moved logically from user to needs/i)
    ).toBeInTheDocument();
  });

  it("renders multi-paragraph summary as separate <p> elements split on blank lines", () => {
    const twoParaText =
      "Paragraph one describes what worked, anchored to a candidate moment.\n\nParagraph two describes what was missed, with prescriptive coaching for the gap.";
    const { container } = render(
      <SummaryCard {...baseProps} loading={false} summaryText={twoParaText} />,
    );
    // Find the paragraphs inside the summary section
    const summarySection = container.querySelector(
      '[data-testid="summary-paragraph"]',
    );
    expect(summarySection).not.toBeNull();
    const paragraphs = summarySection!.querySelectorAll("p");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toContain("what worked");
    expect(paragraphs[1].textContent).toContain("what was missed");
  });

  it("renders single-paragraph text as one <p> when no double newline present", () => {
    const onePara = "Just one paragraph with no blank line in it.";
    const { container } = render(
      <SummaryCard {...baseProps} loading={false} summaryText={onePara} />,
    );
    const summarySection = container.querySelector(
      '[data-testid="summary-paragraph"]',
    );
    const paragraphs = summarySection!.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
  });

  it("(c) duration and (e) spend appear in the stats row", () => {
    render(<SummaryCard {...baseProps} loading={false} summaryText="x" />);
    expect(screen.getByText("29:42")).toBeInTheDocument();
    expect(screen.getByText("$0.085")).toBeInTheDocument();
    expect(screen.getByText(/charged to your provider/i)).toBeInTheDocument();
  });

  it("(f) renders 'Start another session' CTA pointing to case-select", () => {
    render(<SummaryCard {...baseProps} loading={false} summaryText="x" />);
    const cta = screen.getByRole("link", { name: /Start another session/i });
    expect(cta).toHaveAttribute("href", "/onboarding/case-select");
  });

  it("(d) renders the transcript view button when handler provided", () => {
    const onViewTranscript = vi.fn();
    render(
      <SummaryCard
        {...baseProps}
        loading={false}
        summaryText="x"
        onViewTranscript={onViewTranscript}
      />
    );
    const btn = screen.getByTestId("view-transcript");
    expect(btn).toBeInTheDocument();
  });

  it("session id is truncated to 8 chars + ellipsis for display", () => {
    render(<SummaryCard {...baseProps} loading={false} summaryText="x" />);
    expect(screen.getByText(/abc-1234…/)).toBeInTheDocument();
  });

  describe("(b) copy-to-clipboard", () => {
    const originalClipboard = navigator.clipboard;

    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    afterEach(() => {
      Object.assign(navigator, { clipboard: originalClipboard });
    });

    it("copies the summary text and shows '✓ Copied' confirmation", async () => {
      render(
        <SummaryCard
          {...baseProps}
          loading={false}
          summaryText="The candidate moved logically..."
        />
      );
      const copyButton = screen.getByRole("button", { name: /Copy summary/i });
      await userEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "The candidate moved logically..."
      );
      await waitFor(() => {
        expect(screen.getByText(/Copied/i)).toBeInTheDocument();
      });
    });
  });
});
