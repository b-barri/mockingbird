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
        Estimated cost per session
      </div>
      <div className="font-display text-2xl tracking-tight text-ink">
        {formatCostRange(range)}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mute">
        Charged to your{" "}
        <strong className="text-ink">own provider accounts</strong>, not to
        Mockingbird. Estimates are based on a 30-minute session and may vary
        with how long you speak.
      </p>
    </aside>
  );
}
