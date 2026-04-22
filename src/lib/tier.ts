// Quality tier helpers — kept in one place so badges and copy stay consistent
// across Printers list, Dashboard, and onboarding.

export type Tier = "hobbyist" | "maker" | "professional";

export const tierFromScore = (score: number): Tier =>
  score >= 85 ? "professional" : score >= 60 ? "maker" : "hobbyist";

export const TIER_META: Record<Tier, { label: string; sublabel: string; tone: string }> = {
  hobbyist: {
    label: "Hobbyist",
    sublabel: "New maker, getting started",
    tone: "bg-muted text-foreground",
  },
  maker: {
    label: "Verified Maker",
    sublabel: "Proven specs and samples",
    tone: "bg-accent/15 text-accent",
  },
  professional: {
    label: "Professional Grade",
    sublabel: "Top-tier quality and track record",
    tone: "bg-primary/10 text-primary",
  },
};

// Realistic earnings estimate shown to makers BEFORE they list (3D Hubs cause #2)
// Numbers are intentionally modest so we never set "get rich quick" expectations.
export const estimateMonthlyEarnings = (opts: {
  pricePerGram: number;
  hasAms: boolean;
  acceptsBulk: boolean;
  materialsCount: number;
}) => {
  const { pricePerGram, hasAms, acceptsBulk, materialsCount } = opts;
  // Base = ~6 prints/mo at avg 35g each
  const basePrints = 6;
  const amsBoost = hasAms ? 1.4 : 1;
  const bulkBoost = acceptsBulk ? 1.25 : 1;
  const materialBoost = 1 + Math.min(materialsCount - 1, 3) * 0.08;
  const printsPerMonth = Math.round(basePrints * amsBoost * bulkBoost * materialBoost);
  const avgGrams = 38;
  const grossPerPrint = pricePerGram * avgGrams;
  // Platform takes 10%
  const netPerPrint = grossPerPrint * 0.9;
  const low = Math.round(netPerPrint * printsPerMonth * 0.6);
  const high = Math.round(netPerPrint * printsPerMonth * 1.4);
  return { low, high, printsPerMonth };
};
