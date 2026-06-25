import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BriefView } from "@/components/screen/brief-view";
import type { Brief } from "@/lib/screen/brief";

function brief(over: Partial<Brief> = {}): Brief {
  return {
    id: "b1",
    company: "Fireflies",
    role: "Product Manager",
    companyUrl: "https://fireflies.ai",
    likelyQuestions: [
      { question: "Why Fireflies?", rationale: "tests fit", companySpecific: true },
      { question: "Tell me about a launch", rationale: "role staple", companySpecific: false },
    ],
    evalParameters: [
      { name: "Product sense", description: "reasons from user need" },
      { name: "Communication", description: "structured, concise" },
    ],
    companySignals: [
      { point: "knows the AI notetaker product", companySpecific: true },
    ],
    candidateGaps: ["no B2B SaaS experience"],
    hasCompanySignal: true,
    generatedAt: 0,
    ...over,
  };
}

describe("BriefView", () => {
  it("renders all sections of the brief", () => {
    render(<BriefView brief={brief()} />);
    expect(screen.getByTestId("brief-view")).toBeInTheDocument();
    expect(screen.getByText("Why Fireflies?")).toBeInTheDocument();
    expect(screen.getByText(/Product sense/)).toBeInTheDocument();
    expect(screen.getByText(/no B2B SaaS experience/)).toBeInTheDocument();
  });

  it("distinguishes company-specific from generic items via tags", () => {
    render(<BriefView brief={brief()} />);
    // One company tag for the company-specific question + one for the signal,
    // and at least one generic tag for the role-staple question.
    expect(screen.getAllByText("company").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("generic").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the honest-degradation banner when there is no company signal", () => {
    render(
      <BriefView
        brief={brief({ hasCompanySignal: false, companySignals: [] })}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/no strong company-specific signal/i);
  });

  it("hides the signals section when there are no company signals", () => {
    render(<BriefView brief={brief({ companySignals: [] })} />);
    expect(screen.queryByText(/SIGNALS_TO_HIT/)).not.toBeInTheDocument();
  });
});
