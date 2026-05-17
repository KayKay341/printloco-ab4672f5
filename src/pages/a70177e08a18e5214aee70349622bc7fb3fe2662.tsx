/**
 * Interactive cost estimator. The slicer is the source of truth for
 * grams + minutes for the CURRENT settings (material, layer height, infill,
 * walls, supports, scale, units). This component layers on quantity, rush
 * surcharge, and per-gram price to derive the customer-facing total — no
 * cubic post-scaling, no infill heuristics, no shell math.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Layers,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MATERIAL_BASE_PRICE } from "@/lib/stlSlicer";

export type CostInputs = {
  /** Controls how dimensions are displayed to the user. */
  units: "mm" | "in";
  /** Controls how uploaded mesh coordinates are interpreted by the slicer. */
  sourceUnits: "mm" | "in";
  scalePct: number;
  quantity: number;
  material: string;
  infillPct: number;
  layerHeightMm: number;
  walls: number;
  supports: boolean;
  rush: boolean;
  deliveryMethod: "pickup" | "delivery";
};

export const DEFAULT_COST_INPUTS: CostInputs = {
  units: "mm",
  sourceUnits: "mm",
  scalePct: 100,
  quantity: 1,
  material: "PLA",
  infillPct: 20,
  layerHeightMm: 0.2,
  walls: 3,
  supports: false,
  rush: false,
  deliveryMethod: "pickup",
};

export type EstimatorBase = {
  /** Grams per unit from the most-recent real slice. */
  weightG: number;
  /** Print minutes per unit from the most-recent real slice. */
  printMinutes: number;
  /** Bounding box (mm) of the geometry the slicer received (already scaled). */
  bboxMm: { x: number; y: number; z: number };
  /** Per-gram price override (e.g. picked maker's price). Falls back to material default. */
  pricePerGram?: number;
  triangles?: number;
};

export type EstimatorOutput = {
  weightG: number;
  printMinutes: number;
  amountCents: number;
  perUnitCents: number;
  bbox: { x: number; y: number; z: number };
};

type Props = {
  base: EstimatorBase;
  inputs: CostInputs;
  onChange: (inputs: CostInputs) => void;
  onResolved?: (out: EstimatorOutput) => void;
  /** When true, the material picker is hidden (3MF jobs already use multi-material). */
  hideMaterial?: boolean;
  /** When true, settings have changed since the last slice — show a stale banner. */
  dirty?: boolean;
  /** Optional handler for the "Slice plate" button rendered when dirty. */
  onSlice?: () => void;
  slicing?: boolean;
};

const LAYER_HEIGHTS = [0.08, 0.12, 0.16, 0.2, 0.28];

export const MIN_PRICE_CENTS = 200; // $2.00 platform-wide floor

export function computeEstimate(base: EstimatorBase, i: CostInputs): EstimatorOutput {
  const qty = Math.max(1, Math.min(500, Math.floor(i.quantity)));

  // Weight + time come straight from the slicer (already accounts for scale,
  // units, infill, walls, supports because we re-sliced when those changed).
  const totalWeightG = Math.max(0, base.weightG) * qty;
  const totalMinutes = Math.max(0, base.printMinutes) * qty;

  const ppg = base.pricePerGram ?? MATERIAL_BASE_PRICE[i.material] ?? 0.2;
  const baseCost = totalWeightG * ppg;
  const machineCost = (totalMinutes / 60) * 1.5; // $1.50/hr machine time
  const setup = totalWeightG > 0 ? 0.75 : 0;
  const supportsBump = i.supports && totalWeightG > 0 ? Math.max(0.5, totalWeightG * 0.02) : 0;
  let total = baseCost + machineCost + setup + supportsBump;
  if (i.rush) total *= 1.25;
  if (i.deliveryMethod === "delivery") total += 5.00; // $5 flat delivery fee
  total *= 1.1; // platform + processing

  const amountCents = totalWeightG > 0
    ? Math.max(MIN_PRICE_CENTS, Math.round(total * 100))
    : 0;
  const perUnitCents = qty > 0 ? Math.round(amountCents / qty) : 0;

  return {
    weightG: totalWeightG,
    printMinutes: totalMinutes,
    amountCents,
    perUnitCents,
    bbox: { ...base.bboxMm },
  };
}

type MarketResearch = {
  marketLowCents: number;
  marketTypicalCents: number;
  marketHighCents: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  sources: string[];
};
type ResearchResult = {
  finalCents: number;
  localCents: number;
  minimumApplied: boolean;
  market: MarketResearch | null;
  breakdown?: Array<{ label: string; cents: number }>;
};

export default function CostEstimator({ base, inputs, onChange, onResolved, hideMaterial, dirty, onSlice, slicing }: Props) {
  const out = useMemo(() => computeEstimate(base, inputs), [base, inputs]);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researching, setResearching] = useState(false);

  // Invalidate research whenever the underlying spec changes.
  useEffect(() => { setResearch(null); }, [
    out.amountCents, out.weightG, out.printMinutes, inputs.material, inputs.rush,
  ]);

  useEffect(() => {
    onResolved?.(out);
  }, [out, onResolved]);

  const setI = (patch: Partial<CostInputs>) => onChange({ ...inputs, ...patch });

  const bboxLabel = inputs.units === "mm"
    ? `${out.bbox.x.toFixed(0)} × ${out.bbox.y.toFixed(0)} × ${out.bbox.z.toFixed(0)} mm`
    : `${(out.bbox.x / 25.4).toFixed(2)} × ${(out.bbox.y / 25.4).toFixed(2)} × ${(out.bbox.z / 25.4).toFixed(2)} in`;

  const weightLabel = `${out.weightG.toFixed(1)} g · ${(out.weightG / 28.3495).toFixed(2)} oz`;
  const timeLabel = fmtMinutes(out.printMinutes);

  const minimumApplied = out.amountCents > 0 && out.amountCents <= MIN_PRICE_CENTS;
  const displayCents = research?.finalCents ?? out.amountCents;
  const displayPerUnitCents = inputs.quantity > 0 ? Math.round(displayCents / inputs.quantity) : 0;

  async function refineWithResearch() {
    if (out.weightG <= 0) {
      toast.error("Slice the model first so we have something to research.");
      return;
    }
    setResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-cost", {
        body: {
          service: "3d_print",
          material: inputs.material,
          quantity: inputs.quantity,
          weightG: base.weightG,
          printMinutes: base.printMinutes,
          bboxMm: base.bboxMm,
          rush: inputs.rush,
          research: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResearch(data as ResearchResult);
      toast.success("Refined with market research");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch market data");
    } finally {
      setResearching(false);
    }
  }


  return (
    <div className="rounded-3xl bg-gradient-hero p-6 shadow-card">
      {dirty && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <span className="font-medium">Settings changed — re-slice to refresh the quote.</span>
          {onSlice && (
            <Button size="sm" variant="hero" onClick={onSlice} disabled={slicing}>
              {slicing ? "Slicing…" : "Slice plate"}
            </Button>
          )}
        </div>
      )}

      {/* Big total */}
      <div className={`flex items-end justify-between gap-3 ${dirty ? "opacity-50" : ""}`}>
        <div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {research ? "Researched estimate" : "Live estimate"}
            </div>
            {!dirty && !slicing && base.weightG > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight text-primary">
                <ShieldCheck className="h-2.5 w-2.5" />
                Verified Slicer Data
              </div>
            )}
          </div>
          <div className="mt-1 font-display text-5xl font-semibold leading-none transition-all duration-300">
            ${(displayCents / 100).toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            ${(displayPerUnitCents / 100).toFixed(2)} / unit · {inputs.quantity} ×
          </div>
          {minimumApplied && (
            <div className="mt-1 text-[11px] font-medium text-primary">
              From $2.00 minimum
            </div>
          )}
        </div>
        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          <div>{weightLabel}</div>
          <div>{timeLabel}</div>
          <div>{bboxLabel}</div>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-background/60 p-3 text-xs">
        <Stat icon={<Sparkles className="h-3 w-3" />} label="Weight" value={weightLabel} />
        <Stat icon={<Timer className="h-3 w-3" />} label="Print time" value={timeLabel} />
        <Stat icon={<Ruler className="h-3 w-3" />} label="Bbox" value={bboxLabel} />
      </div>

      {/* Research panel */}
      <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
        {!research ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Fair-price check.</span>{" "}
              Compare against real-world maker shop pricing.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refineWithResearch}
              disabled={researching || dirty || out.weightG <= 0}
              className="gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {researching ? "Researching…" : "Refine with research"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Market range
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  {research.market?.confidence ?? "estimate"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setResearch(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            {research.market && (
              <>
                <MarketRangeBar
                  lowCents={research.market.marketLowCents}
                  typicalCents={research.market.marketTypicalCents}
                  highCents={research.market.marketHighCents}
                  youCents={research.finalCents}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {research.market.rationale}
                </p>
                {research.market.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {research.market.sources.map((s) => (
                      <span key={s} className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            {research.minimumApplied && (
              <div className="text-[11px] font-medium text-primary">
                $2.00 minimum applied — small jobs still need setup time.
              </div>
            )}
          </div>
        )}
      </div>


      {/* Controls */}
      <div className="mt-5 space-y-5">
        {/* Display units + model units + quantity */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Display units</Label>
            <div className="mt-2 inline-flex rounded-full border border-border bg-background p-0.5">
              {(["mm", "in"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setI({ units: u })}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    inputs.units === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Model units</Label>
            <div className="mt-2 inline-flex rounded-full border border-border bg-background p-0.5">
              {(["mm", "in"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setI({ sourceUnits: u })}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    inputs.sourceUnits === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Re-slices the model in inches if your file was authored that way.
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" onClick={() => setI({ quantity: Math.max(1, inputs.quantity - 1) })}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min={1}
                max={500}
                value={inputs.quantity}
                onChange={(e) => setI({ quantity: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })}
                className="h-9 w-20 text-center"
              />
              <Button type="button" size="icon" variant="outline" onClick={() => setI({ quantity: Math.min(500, inputs.quantity + 1) })}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scale slider */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scale</Label>
            <span className="text-sm font-semibold">{inputs.scalePct}%</span>
          </div>
          <Slider
            value={[inputs.scalePct]}
            min={25}
            max={300}
            step={5}
            onValueChange={([v]) => setI({ scalePct: v })}
            className="mt-2"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">Re-slices the model at the new size.</div>
        </div>

        {/* Infill */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Infill</Label>
            <span className="text-sm font-semibold">{inputs.infillPct}%</span>
          </div>
          <Slider
            value={[inputs.infillPct]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setI({ infillPct: v })}
            className="mt-2"
          />
        </div>

        {/* Layer height + walls */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Layer height</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LAYER_HEIGHTS.map((lh) => (
                <button
                  key={lh}
                  type="button"
                  onClick={() => setI({ layerHeightMm: lh })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    inputs.layerHeightMm === lh
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lh.toFixed(2)} mm
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Walls</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" onClick={() => setI({ walls: Math.max(1, inputs.walls - 1) })}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min={1}
                max={8}
                value={inputs.walls}
                onChange={(e) => setI({ walls: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                className="h-9 w-20 text-center"
              />
              <Button type="button" size="icon" variant="outline" onClick={() => setI({ walls: Math.min(8, inputs.walls + 1) })}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-primary" /> Supports
            </span>
            <Switch checked={inputs.supports} onCheckedChange={(v) => setI({ supports: v })} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" /> Rush (24h) <span className="text-xs text-muted-foreground">+25%</span>
            </span>
            <Switch checked={inputs.rush} onCheckedChange={(v) => setI({ rush: v })} />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3 sm:col-span-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Home Delivery <span className="text-xs text-muted-foreground">+$5.00 flat fee</span>
            </span>
            <div className="flex gap-1 rounded-full border border-border bg-background p-0.5">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setI({ deliveryMethod: m })}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full transition-colors ${
                    inputs.deliveryMethod === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-0.5 font-display text-sm font-semibold">{value}</div>
  </div>
);

function fmtMinutes(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

function MarketRangeBar({
  lowCents, typicalCents, highCents, youCents,
}: { lowCents: number; typicalCents: number; highCents: number; youCents: number }) {
  const lo = Math.min(lowCents, youCents);
  const hi = Math.max(highCents, youCents);
  const span = Math.max(1, hi - lo);
  const pos = (c: number) => `${((c - lo) / span) * 100}%`;
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  return (
    <div className="space-y-1.5">
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className="absolute top-0 h-2 rounded-full bg-primary/30"
          style={{ left: pos(lowCents), width: `calc(${pos(highCents)} - ${pos(lowCents)})` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
          style={{ left: pos(typicalCents) }}
          title={`Typical ${fmt(typicalCents)}`}
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: pos(youCents) }}
          title={`Your price ${fmt(youCents)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Low {fmt(lowCents)}</span>
        <span className="font-semibold text-foreground">You {fmt(youCents)}</span>
        <span>High {fmt(highCents)}</span>
      </div>
    </div>
  );
}

