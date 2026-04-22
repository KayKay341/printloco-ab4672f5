import { TrendingUp, Info } from "lucide-react";
import { estimateMonthlyEarnings } from "@/lib/tier";

type Props = {
  pricePerGram: number;
  hasAms: boolean;
  acceptsBulk: boolean;
  materialsCount: number;
};

// Honest, anti-3D-Hubs earnings panel. We deliberately avoid "make $$$$/mo"
// language — we want makers to come in expecting a realistic side income.
export const EarningsEstimate = ({ pricePerGram, hasAms, acceptsBulk, materialsCount }: Props) => {
  const { low, high, printsPerMonth } = estimateMonthlyEarnings({
    pricePerGram,
    hasAms,
    acceptsBulk,
    materialsCount,
  });
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent" />
        <div className="text-sm font-semibold">Realistic monthly earnings</div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-3xl font-semibold">${low}–${high}</div>
        <div className="text-sm text-muted-foreground">/ month, after platform fee</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Based on ~{printsPerMonth} prints/month at average size. New makers usually
        sit at the low end while building a reputation.
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/60 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span>
          PrintLoco is designed for <strong>side income</strong>, not full-time hours.
          We keep expectations honest so neighbors don't burn out — that's how
          marketplaces stay healthy.
        </span>
      </div>
    </div>
  );
};

export default EarningsEstimate;
