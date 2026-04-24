/**
 * Interactive cost estimator. Reads a base "slice" (weight/time/bbox) and
 * applies user-tunable parameters (units, scale, qty, infill, layer height,
 * walls, supports, rush) to derive live totals.
 *
 * Pure presentational — parent owns the source mesh. We expose the resolved
 * total so the parent can pass it into checkout.
 */

import { useEffect, useMemo } from "react";
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
  Wrench,
  Zap,
} from "lucide-react";
import { MATERIAL_BASE_PRICE } from "@/lib/stlSlicer";

export type CostInputs = {
  /** Display units AND source-mesh interpretation. "in" treats raw mesh
   *  coordinates as inches (×25.4 to convert to mm) — fixes huge quotes
   *  on STLs that were exported in inches. */
  units: "mm" | "in";
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
  /** Weight from the unmodified slice (1×, 20% infill, 0.2mm). */
  baseWeightG: number;
  /** Print minutes from the unmodified slice. */
  basePrintMinutes: number;
  /** Bounding box in mm, original scale. */
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
};

const LAYER_HEIGHTS = [0.08, 0.12, 0.16, 0.2, 0.28];

export function computeEstimate(base: EstimatorBase, i: CostInputs): EstimatorOutput {
  // Volume scales as scale^3.
  const userScale = Math.max(10, Math.min(500, i.scalePct)) / 100;
  // If user says model is in inches, convert mesh from inches → mm: ×25.4 linear,
  // ×16387.064 volumetric. We only apply this if the bbox in mm is suspicious
  // (e.g. >2m or <2mm), OR the user explicitly toggled to inches.
  const unitFactor = i.units === "in" ? 25.4 : 1;
  const linearScale = userScale * unitFactor;
  const volScale = Math.pow(linearScale, 3);

  // Infill model: shell stays solid, interior scales with infill density.
  const shellSolidFraction = Math.min(0.5, 0.1 + i.walls * 0.05);
  const infill = Math.max(0, Math.min(100, i.infillPct)) / 100;
  const effectiveSolid = shellSolidFraction + (1 - shellSolidFraction) * infill;
  const baselineSolid = 0.25 + 0.75 * 0.2; // matches sliceStlBuffer default
  const massRatio = effectiveSolid / baselineSolid;

  let weightPerUnit = base.baseWeightG * volScale * massRatio;
  if (i.supports) weightPerUnit *= 1.08;

  // Print time scales with volume and inversely with layer height.
  const layerFactor = 0.2 / Math.max(0.04, i.layerHeightMm);
  let timePerUnit = base.basePrintMinutes * volScale * layerFactor;
  if (i.supports) timePerUnit *= 1.12;

  const qty = Math.max(1, Math.min(500, Math.floor(i.quantity)));
  const totalWeightG = weightPerUnit * qty;
  const totalMinutes = timePerUnit * qty;

  const ppg = base.pricePerGram ?? MATERIAL_BASE_PRICE[i.material] ?? 0.2;
  const baseCost = totalWeightG * ppg;
  const supportsBump = i.supports ? Math.max(0.5, totalWeightG * 0.02) : 0;
  let total = baseCost + supportsBump;
  if (i.rush) total *= 1.25;

  const amountCents = Math.max(100, Math.round(total * 100));
  const perUnitCents = Math.round(amountCents / qty);

  // Bbox in MM after scale + source-unit interpretation.
  const bboxMm = {
    x: base.bboxMm.x * linearScale,
    y: base.bboxMm.y * linearScale,
    z: base.bboxMm.z * linearScale,
  };

  return { weightG: totalWeightG, printMinutes: totalMinutes, amountCents, perUnitCents, bbox: bboxMm };
}

export default function CostEstimator({ base, inputs, onChange, onResolved, hideMaterial }: Props) {
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
      {/* Big total */}
      <div className="flex items-end justify-between gap-3">
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

      {/* Quick stats grid (mobile + always visible) */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-background/60 p-3 text-xs">
        <Stat icon={<Sparkles className="h-3 w-3" />} label="Weight" value={weightLabel} />
        <Stat icon={<Timer className="h-3 w-3" />} label="Print time" value={timeLabel} />
        <Stat icon={<Ruler className="h-3 w-3" />} label="Bbox" value={bboxLabel} />
      </div>

      {/* Controls */}
      <div className="mt-5 space-y-5">
        {/* Units + Quantity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Units</Label>
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
          <div className="mt-1 text-[11px] text-muted-foreground">
            Lower = lighter and faster · Higher = stronger
          </div>
        </div>

        {/* Layer height + walls */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              <Layers className="mr-1 inline h-3 w-3" /> Layer height
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LAYER_HEIGHTS.map((lh) => (
                <button
                  key={lh}
                  type="button"
                  onClick={() => setI({ layerHeightMm: lh })}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    Math.abs(inputs.layerHeightMm - lh) < 0.001
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  {lh}
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
                max={6}
                value={inputs.walls}
                onChange={(e) => setI({ walls: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })}
                className="h-9 w-16 text-center"
              />
              <Button type="button" size="icon" variant="outline" onClick={() => setI({ walls: Math.min(6, inputs.walls + 1) })}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            icon={<Wrench className="h-4 w-4" />}
            label="Supports"
            hint="+8% material, +12% time"
            checked={inputs.supports}
            onChange={(v) => setI({ supports: v })}
          />
          <ToggleRow
            icon={<Zap className="h-4 w-4" />}
            label="Rush (24h)"
            hint="+25% surcharge"
            checked={inputs.rush}
            onChange={(v) => setI({ rush: v })}
          />
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-card/50 p-2">
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <div className="mt-0.5 truncate font-semibold">{value}</div>
  </div>
);

const ToggleRow = ({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3">
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

function fmtMinutes(mins: number): string {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}
