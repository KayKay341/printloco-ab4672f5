import { Check } from "lucide-react";

export type FilamentColor = { name: string; hex: string };

export const COMMON_COLORS: FilamentColor[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F5F5F5" },
  { name: "Red", hex: "#E63946" },
  { name: "Blue", hex: "#1D4ED8" },
  { name: "Green", hex: "#16A34A" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#F97316" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#D4AF37" },
];

interface Props {
  value: string | null;
  onChange: (name: string, hex: string) => void;
  options?: FilamentColor[];
}

const ColorPicker = ({ value, onChange, options = COMMON_COLORS }: Props) => {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {options.map((c) => {
        const selected = value === c.name;
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name, c.hex)}
            title={c.name}
            aria-label={c.name}
            className={`relative aspect-square rounded-xl border-2 transition-all ${
              selected ? "border-foreground scale-110 shadow-card" : "border-border hover:scale-105"
            }`}
            style={{ backgroundColor: c.hex }}
          >
            {selected && (
              <Check
                className="absolute inset-0 m-auto h-4 w-4"
                style={{ color: isLight(c.hex) ? "#000" : "#fff" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

export default ColorPicker;
