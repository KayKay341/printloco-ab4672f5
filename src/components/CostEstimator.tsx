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

export default function CostEstimator({ base, inputs, onChange, onResolved, hideMaterial, dirty, onSlice, slicing }: Props) {
  const out = useMemo(() => computeEstimate(base, inputs), [base, inputs]);

  useEffect(() => {
    onResolved?.(out);
  }, [out, onResolved]);

  const setI = (patch: Partial<CostInputs>) => onChange({ ...inputs, ...patch });

  const bboxLabel = inputs.units === "mm"
    ? `${out.bbox.x.toFixed(0)} × ${out.bbox.y.toFixed(0)} × ${out.bbox.z.toFixed(0)} mm`
    : `${(out.bbox.x / 25.4).toFixed(2)} × ${(out.bbox.y / 25.4).toFixed(2)} × ${(out.bbox.z / 25.4).toFixed(2)} in`;

  const weightLabel = `${out.weightG.toFixed(1)} g · ${(out.weightG / 28.3495).toFixed(2)} oz`;
  const timeLabel = fmtMinutes(out.printMinutes);

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
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live estimate</div>
          <div className="mt-1 font-display text-5xl font-semibold leading-none">
            ${(out.amountCents / 100).toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            ${(out.perUnitCents / 100).toFixed(2)} / unit · {inputs.quantity} ×
          </div>
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
