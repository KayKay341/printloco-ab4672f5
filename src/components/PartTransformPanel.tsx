import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Copy,
  Move,
  RotateCw,
  Trash2,
  Maximize2,
  CornerDownLeft,
} from "lucide-react";
import type { PartState, PartTransform } from "@/lib/sliceJob";

type Props = {
  part: PartState | null;
  onChange: (patch: Partial<PartTransform>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCenter: () => void;
  onLayFlat: () => void;
  /** Plate footprint mm — used to bound translate sliders. */
  plate: { x: number; y: number };
};

export default function PartTransformPanel({
  part, onChange, onDuplicate, onDelete, onCenter, onLayFlat, plate,
}: Props) {
  if (!part) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-4 text-center text-xs text-muted-foreground">
        Click a part on the plate to transform it.
      </div>
    );
  }
  const t = part.transform;
  const halfX = plate.x / 2;
  const halfY = plate.y / 2;

  const rotBtn = (axis: "rotX" | "rotY" | "rotZ", deg: number, label: string) => (
    <button
      type="button"
      onClick={() => onChange({ [axis]: ((t[axis] + deg) % 360 + 360) % 360 - (((t[axis] + deg) % 360 + 360) % 360 > 180 ? 360 : 0) } as Partial<PartTransform>)}
      className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected part</div>
          <div className="truncate font-display text-sm font-semibold">{part.fileName}</div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onDuplicate} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Position */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Move className="h-3 w-3" /> Position (mm)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AxisRow label="X" value={t.tx} min={-halfX} max={halfX} step={0.5} onChange={(v) => onChange({ tx: v })} />
          <AxisRow label="Y" value={t.ty} min={-halfY} max={halfY} step={0.5} onChange={(v) => onChange({ ty: v })} />
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={onCenter} className="h-7 px-2 text-[11px]">
            <CornerDownLeft className="mr-1 h-3 w-3" /> Center
          </Button>
          <Button size="sm" variant="ghost" onClick={onLayFlat} className="h-7 px-2 text-[11px]">
            <Maximize2 className="mr-1 h-3 w-3" /> Lay flat
          </Button>
        </div>
      </div>

      {/* Rotation */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <RotateCw className="h-3 w-3" /> Rotation (°)
        </div>
        <div className="space-y-2">
          {(["rotX", "rotY", "rotZ"] as const).map((axis) => {
            const lbl = axis === "rotX" ? "X" : axis === "rotY" ? "Y" : "Z";
            return (
              <div key={axis} className="grid grid-cols-[20px_1fr_auto_auto] items-center gap-2">
                <span className="text-xs font-semibold">{lbl}</span>
                <Slider
                  value={[t[axis]]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([v]) => onChange({ [axis]: v } as Partial<PartTransform>)}
                />
                <Input
                  type="number"
                  min={-360}
                  max={360}
                  step={1}
                  value={Math.round(t[axis] * 10) / 10}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onChange({ [axis]: v } as Partial<PartTransform>);
                  }}
                  className="h-8 w-16 text-center text-xs tabular-nums"
                />
                {rotBtn(axis, 90, "+90°")}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-part scale */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scale (%)
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <Slider
            value={[Math.round(t.scale * 100)]}
            min={25}
            max={300}
            step={5}
            onValueChange={([v]) => onChange({ scale: v / 100 })}
          />
          <Input
            type="number"
            min={25}
            max={300}
            step={1}
            value={Math.round(t.scale * 100)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange({ scale: Math.max(0.25, Math.min(3, n / 100)) });
            }}
            className="h-8 w-16 text-center"
          />
        </div>
      </div>
    </div>
  );
}

/** Slider + numeric text input row so users can type exact values. */
function AxisRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold">{label}</span>
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Math.round(value * 10) / 10}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="h-6 w-20 text-right text-[11px] tabular-nums"
        />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

// Re-export for default-import simplicity.
export { Label };
