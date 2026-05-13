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
      className="rounded-lg border border-ink/[0.08] bg-cream/60 p-4"
    >
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
        Roughly what one case will cost you
      </div>
      <div className="font-display text-2xl tracking-tight text-ink">
        {formatCostRange(range)}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mute">
        Goes to{" "}
        <strong className="text-ink">your provider account</strong>, not to
        Mockingbird. Math assumes a 30-minute case — quieter candidates pay
        less. Yes, that's a metric you can game.
      </p>
    </aside>
  );
}
