import { Award, ShieldCheck, Sparkles } from "lucide-react";
import { TIER_META, type Tier } from "@/lib/tier";

const ICONS: Record<Tier, React.ElementType> = {
  hobbyist: Sparkles,
  maker: ShieldCheck,
  professional: Award,
};

type Props = {
  tier: Tier;
  score?: number;
  size?: "sm" | "md";
  showScore?: boolean;
};

export const TierBadge = ({ tier, score, size = "sm", showScore = false }: Props) => {
  const meta = TIER_META[tier];
  const Icon = ICONS[tier];
  const padding = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const text = size === "md" ? "text-xs" : "text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider ${meta.tone} ${padding} ${text}`}
      title={`${meta.label} — ${meta.sublabel}${score != null ? ` (Quality ${score}/100)` : ""}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
      {showScore && score != null && <span className="opacity-70">· {score}</span>}
    </span>
  );
};

export default TierBadge;
