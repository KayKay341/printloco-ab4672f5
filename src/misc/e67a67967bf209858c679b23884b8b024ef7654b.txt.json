import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Ruler, Scan, AlertCircle, Maximize, Layers, MousePointer2, Scissors, Eraser, Info } from "lucide-react";
import { type Unit, fromMm, formatUnit } from "@/lib/units";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type Operation = "cut" | "engrave" | "ignore";

type ColorLayer = {
  id: string;
  hex: string;
  type: "stroke" | "fill";
  op: Operation;
  lengthMm: number;
  areaMm2: number;
  count: number;
};

type SpecsDetected = {
  widthMm: number;
  heightMm: number;
  cutLengthMm: number;
  engraveAreaCm2: number;
};

type Props = {
  file: File | null;
  unit?: Unit;
  onSpecsDetected?: (specs: SpecsDetected) => void;
};

type ParsedFile = {
  raw: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  layers: ColorLayer[];
  isImage?: boolean;
};

/**
 * Interactive Laser Cut Preview.
 * Allows users to choose which colors/fills are Cut vs Engraved.
 */
export default function LaserCutPreview({ file, unit = "mm", onSpecsDetected }: Props) {
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [manualWidth, setManualWidth] = useState<string>("");
  const [currentPart, setCurrentPart] = useState<ParsedFile | null>(null);
  const [hoverLayer, setHoverLayer] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const autoOptimize = useCallback(() => {
    if (!currentPart) return;

    let totalCut = 0;
    let totalEngraveCm2 = 0;
    
    currentPart.layers.forEach(l => {
      if (l.op === "cut") {
        totalCut += l.lengthMm;
      } else if (l.op === "engrave") {
        if (l.type === "fill") {
          totalEngraveCm2 += l.areaMm2 / 100;
        } else {
          totalEngraveCm2 += (l.lengthMm * 0.5) / 100;
        }
      }
    });

    onSpecsDetected?.({
      widthMm: currentPart.widthMm,
      heightMm: currentPart.heightMm,
      cutLengthMm: totalCut,
      engraveAreaCm2: totalEngraveCm2
    });
  }, [currentPart, onSpecsDetected]);

  useEffect(() => {
    autoOptimize();
  }, [currentPart, autoOptimize]);

  const handleSvgFile = async (file: File) => {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("No SVG element found");

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.visibility = "hidden";
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "hidden";
    const clone = svg.cloneNode(true) as SVGSVGElement;
    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const bbox = (clone as any).getBBox();
      const parseAttrSize = (v: string | null): number => {
        if (!v) return 0;
        const n = parseFloat(v);
        if (v.endsWith("in")) return n * 25.4;
        if (v.endsWith("cm")) return n * 10;
        if (v.endsWith("mm")) return n;
        return (n / 96) * 25.4;
      };

      const viewboxAttr = (svg.getAttribute("viewBox") || "").split(/[,\s]+/);
      const vbW = parseFloat(viewboxAttr[2]) || bbox.width || 1;
      const attrW = parseAttrSize(svg.getAttribute("width"));
      const scale = attrW ? attrW / vbW : 25.4 / 96;

      const layerMap = new Map<string, { length: number; area: number; count: number; type: "stroke" | "fill"; hex: string }>();
      const elements = clone.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse");
      
      const normalizeColor = (c: string) => {
        const trimmed = c.toLowerCase().trim();
        if (trimmed === "red") return "#ff0000";
        if (trimmed === "black") return "#000000";
        if (trimmed === "blue") return "#0000ff";
        if (trimmed === "green") return "#00ff00";
        if (trimmed === "none" || !trimmed) return null;
        return trimmed;
      };

      elements.forEach((el: any) => {
        const stroke = normalizeColor(el.getAttribute("stroke") || "");
        const fill = normalizeColor(el.getAttribute("fill") || "");
        
        let length = 0;
        if (el.getTotalLength) length = el.getTotalLength() * scale;

        const elBBox = el.getBBox();
        const areaMm2 = elBBox.width * elBBox.height * scale * scale;

        if (stroke) {
          const key = `stroke-${stroke}`;
          const existing = layerMap.get(key) || { length: 0, area: 0, count: 0, type: "stroke", hex: stroke };
          layerMap.set(key, { ...existing, length: existing.length + length, count: existing.count + 1 });
        }
        if (fill && fill !== "white" && fill !== "#fff" && fill !== "#ffffff") {
          const key = `fill-${fill}`;
          const existing = layerMap.get(key) || { length: 0, area: 0, count: 0, type: "fill", hex: fill };
          layerMap.set(key, { ...existing, area: existing.area + areaMm2, count: existing.count + 1 });
        }
      });

      const layers: ColorLayer[] = Array.from(layerMap.entries()).map(([id, data]) => ({
        id,
        hex: data.hex,
        type: data.type,
        lengthMm: data.length,
        areaMm2: data.area,
        count: data.count,
        op: data.hex === "#ff0000" && data.type === "stroke" ? "cut" : "engrave"
      }));

      setCurrentPart({
        raw: text,
        widthMm: bbox.width * scale,
        heightMm: bbox.height * scale,
        aspectRatio: bbox.width / bbox.height,
        layers
      });
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const w = 100;
        const h = (img.height / img.width) * w;
        setCurrentPart({
          raw: e.target?.result as string,
          widthMm: w,
          heightMm: h,
          aspectRatio: img.width / img.height,
          isImage: true,
          layers: [{ id: "img-engrave", hex: "#000000", type: "fill", op: "engrave", lengthMm: 0, areaMm2: w * h, count: 1 }]
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setUnsupported(null);
    setManualWidth("");
    setCurrentPart(null);
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "png" || ext === "jpg" || ext === "jpeg") handleImageFile(file);
    else if (ext === "svg") handleSvgFile(file).catch(() => setUnsupported("SVG"));
    else setUnsupported(ext?.toUpperCase() ?? "file");
  }, [file]);

  const updateLayerOp = (id: string, op: Operation) => {
    if (!currentPart) return;
    setCurrentPart({
      ...currentPart,
      layers: currentPart.layers.map(l => l.id === id ? { ...l, op } : l)
    });
  };

  const handleScale = (val: string) => {
    setManualWidth(val);
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0 || !currentPart) return;
    const wMm = unit === "in" ? n * 25.4 : n;
    const ratio = wMm / currentPart.widthMm;
    setCurrentPart({
      ...currentPart,
      widthMm: wMm,
      heightMm: wMm / currentPart.aspectRatio,
      layers: currentPart.layers.map(l => ({
        ...l,
        lengthMm: l.lengthMm * ratio,
        areaMm2: l.areaMm2 * ratio * ratio
      }))
    });
  };

  const sizeLabel = useMemo(() => {
    if (!currentPart) return "";
    return `${formatUnit(fromMm(currentPart.widthMm, unit), unit)} × ${formatUnit(fromMm(currentPart.heightMm, unit), unit)}`;
  }, [currentPart, unit]);

  if (!file) return (
    <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
      Upload a file to configure operations
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="relative grid min-h-[25rem] place-items-center overflow-hidden rounded-3xl border border-border bg-slate-900 shadow-inner p-8">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            {currentPart ? (
              currentPart.isImage ? (
                <img src={currentPart.raw} className="relative z-10 max-h-[20rem] w-auto drop-shadow-2xl" alt="Preview" />
              ) : (
                <div
                  className="relative z-10 max-h-[20rem] w-full max-w-full drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] [&_svg]:h-auto [&_svg]:max-h-[20rem] [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:mx-auto"
                  dangerouslySetInnerHTML={{ 
                    __html: currentPart.raw
                      .replace(/(stroke|fill)="([^"]*)"/gi, (m, attr, val) => {
                        const hex = val.toLowerCase().trim();
                        const layer = currentPart.layers.find(l => l.hex === hex && l.type === attr);
                        if (layer?.op === "ignore") return `${attr}="transparent"`;
                        if (hoverLayer === layer?.id) return `${attr}="${val}" ${attr === 'stroke' ? 'stroke-width="4"' : 'opacity="0.5"'}`;
                        return m;
                      })
                      .replace(/<script[\s\S]*?<\/script>/gi, "") 
                  }}
                />
              )
            ) : unsupported ? (
              <div className="flex flex-col items-center gap-4 text-center text-sm text-slate-400">
                <AlertCircle className="h-10 w-10 text-amber-500" />
                <div>{unsupported} ready for manufacturing.</div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-500 text-sm font-medium animate-pulse">
                <Scan className="h-4 w-4" /> Analyzing geometry…
              </div>
            )}
            {currentPart && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-white/20" />
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{sizeLabel}</div>
                <div className="h-[1px] flex-1 bg-white/20" />
              </div>
            )}
          </div>

          {currentPart && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={<Ruler className="h-3.5 w-3.5" />} label="Bounding Box" value={sizeLabel} />
              <Stat icon={<Scissors className="h-3.5 w-3.5" />} label="Total Cut" value={`${Math.round(currentPart.layers.filter(l => l.op === "cut").reduce((a, b) => a + b.lengthMm, 0))}mm`} />
              <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[10px] uppercase tracking-wider text-primary">Override Width ({unit})</Label>
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-primary opacity-50" /></TooltipTrigger><TooltipContent className="text-xs">Updates overall job scale.</TooltipContent></Tooltip></TooltipProvider>
                </div>
                <Input type="number" placeholder="Set size..." value={manualWidth} onChange={(e) => handleScale(e.target.value)} className="mt-1 h-8 bg-background/50 border-primary/20 text-xs" />
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft h-full flex flex-col">
            <h3 className="font-display font-bold text-sm flex items-center gap-2"><MousePointer2 className="h-4 w-4 text-primary" />Configure Operations</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Choose what to cut vs engrave.</p>
            <div className="mt-6 flex-1 overflow-y-auto space-y-3 max-h-[400px] pr-1">
              {currentPart?.layers.map((l) => (
                <div key={l.id} onMouseEnter={() => setHoverLayer(l.id)} onMouseLeave={() => setHoverLayer(null)} className={`rounded-2xl border p-3 transition-all ${l.op === "ignore" ? "bg-muted/40 opacity-60" : "bg-background border-border hover:border-primary/40 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: l.hex }} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">{l.type}: {l.hex}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{l.type === 'stroke' ? `${Math.round(l.lengthMm)}mm` : `${(l.areaMm2/100).toFixed(1)}cm²`}</span>
                  </div>
                  <div className="flex gap-1">
                    <OpButton active={l.op === "cut"} onClick={() => updateLayerOp(l.id, "cut")} icon={<Scissors className="h-3 w-3" />} label="Cut" />
                    <OpButton active={l.op === "engrave"} onClick={() => updateLayerOp(l.id, "engrave")} icon={<Layers className="h-3 w-3" />} label="Engrave" />
                    <OpButton active={l.op === "ignore"} onClick={() => updateLayerOp(l.id, "ignore")} icon={<Eraser className="h-3 w-3" />} label="Skip" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-primary/5 border border-primary/10 p-3">
              <p className="text-[10px] leading-relaxed text-primary/80"><strong>Pro Tip:</strong> Use Red strokes for through-cuts and Filled shapes for engraving.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function OpButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-bold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}>{icon}{label}</button>
  );
}
