import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { PlateState } from "@/lib/sliceJob";

type Props = {
  plates: PlateState[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export default function PlateTabs({ plates, activeId, onSelect, onAdd, onRemove }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {plates.map((p, idx) => {
        const active = p.id === activeId;
        const dirty = p.dirty;
        const sliced = !!p.lastSlice && p.lastSlice.weightG > 0;
        return (
          <div
            key={p.id}
            className={`group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <button type="button" onClick={() => onSelect(p.id)} className="inline-flex items-center gap-1.5">
              <span>Plate {idx + 1}</span>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  dirty ? "bg-amber-400" : sliced ? "bg-emerald-400" : "bg-muted-foreground/40"
                }`}
                title={dirty ? "Settings changed — needs re-slice" : sliced ? "Sliced" : "Empty"}
              />
              <span className="opacity-70">({p.parts.length})</span>
            </button>
            {plates.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(p.id); }}
                className="ml-0.5 rounded-full p-0.5 opacity-60 hover:bg-background/30 hover:opacity-100"
                title="Remove plate"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
      <Button size="sm" variant="outline" onClick={onAdd} className="h-7 rounded-full px-3 text-xs">
        <Plus className="mr-1 h-3 w-3" /> Add plate
      </Button>
    </div>
  );
}
