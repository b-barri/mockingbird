import {
  estimateSessionCost,
  formatCostRange,
} from "@/lib/auth/cost-card";

interface CostEstimateProps {
  llmProvider: string;
  voiceProvider: string;
}

// R6c: cost transparency on onboarding. Displays a per-session range
// drawn from the rate card. Explicitly tells the user the bill goes to
// their provider accounts, not the operator.
export function CostEstimate({ llmProvider, voiceProvider }: CostEstimateProps) {
  const range = estimateSessionCost({ llmProvider, voiceProvider });
  return (
    <aside
      data-testid="cost-estimate"
      className="rounded-[8px] border border-white/[0.08] bg-white/[0.03] p-4"
    >
      <div className="ascii-rule mb-1.5">
        Roughly what one case will cost you
      </div>
      <div className="font-sans text-2xl font-semibold tracking-[-0.02em] text-ink tabular-nums">
        {formatCostRange(range)}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        Billed to{" "}
        <strong className="text-ink">your provider account</strong>, not to
        Mockingbird. The math assumes a 30-minute case, so shorter sessions
        cost less.
      </p>
    </aside>
  );
}
