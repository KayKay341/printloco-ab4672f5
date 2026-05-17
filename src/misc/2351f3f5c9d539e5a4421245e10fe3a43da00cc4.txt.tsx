import { useEffect, useMemo, useRef, useState } from "react";
import { Ruler, Scan, AlertCircle, Maximize, Layers } from "lucide-react";
import { type Unit, fromMm, formatUnit } from "@/lib/units";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

type ParsedSvg = {
  raw: string;
  widthMm: number;
  heightMm: number;
  cutLengthMm: number;
  engraveAreaCm2: number;
  isImage?: boolean;
  aspectRatio?: number;
};

/**
 * Lightweight in-browser SVG/DXF/PDF/Image preview.
 * - SVG: parsed for size + colored stroke heuristic (red = cut, black = engrave).
 * - Images (PNG/JPG): shows preview and allows setting a reference dimension.
 * - DXF / PDF: shows a friendly placeholder.
 */
export default function SvgPreview({ file, unit = "mm", onSpecsDetected }: Props) {
  const [parsed, setParsed] = useState<ParsedSvg | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [manualWidth, setManualWidth] = useState<string>("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParsed(null);
    setUnsupported(null);
    setManualWidth("");
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const w = 100; // default 100mm
          const h = (img.height / img.width) * w;
          const specs = {
            widthMm: w,
            heightMm: h,
            cutLengthMm: 0,
            engraveAreaCm2: (w * h) / 100 // Estimate image as full engrave
          };
          setParsed({
            raw: e.target?.result as string,
            widthMm: specs.widthMm,
            heightMm: specs.heightMm,
            cutLengthMm: specs.cutLengthMm,
            engraveAreaCm2: specs.engraveAreaCm2,
            isImage: true,
            aspectRatio: img.width / img.height
          });
          onSpecsDetected?.(specs);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    if (ext !== "svg") {
      setUnsupported(ext?.toUpperCase() ?? "file");
      return;
    }

    file.text().then((text) => {
      try {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) throw new Error("no svg element");

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.visibility = "hidden";
        container.style.width = "0";
        container.style.height = "0";
        container.style.overflow = "hidden";
        const clone = svg.cloneNode(true) as SVGSVGElement;
        container.appendChild(clone);
        document.body.appendChild(container);

        let widthMm = 0;
        let heightMm = 0;
        let totalCutLengthMm = 0;
        let totalEngraveAreaMm2 = 0;

        try {
          const bbox = (clone as any).getBBox();
          
          if (!svg.getAttribute("viewBox")) {
            svg.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
          }

          const parseAttrSize = (v: string | null): number => {
            if (!v) return 0;
            const n = parseFloat(v);
            if (v.endsWith("in")) return n * 25.4;
            if (v.endsWith("cm")) return n * 10;
            if (v.endsWith("mm")) return n;
            return (n / 96) * 25.4; // assume 96 DPI for naked units
          };

          const viewboxAttr = (svg.getAttribute("viewBox") || "").split(/[,\s]+/);
          const vbW = parseFloat(viewboxAttr[2]) || 1;
          const vbH = parseFloat(viewboxAttr[3]) || 1;
          const attrW = parseAttrSize(svg.getAttribute("width"));
          
          // Heuristic: if width attr exists, use it to scale. Otherwise assume 1px = 1/96 inch.
          const scale = attrW ? attrW / vbW : 25.4 / 96;

          widthMm = bbox.width * scale;
          heightMm = bbox.height * scale;

          const paths = clone.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse");
          paths.forEach((el: any) => {
            const stroke = (el.getAttribute("stroke") || "").toLowerCase();
            const fill = (el.getAttribute("fill") || "").toLowerCase();
            const isNone = (v: string) => !v || v === "none";

            let length = 0;
            if (el.getTotalLength) {
              length = el.getTotalLength();
            } else {
              // Basic perimeter fallback for non-path shapes if getTotalLength is missing
              const tag = el.tagName.toLowerCase();
              if (tag === "rect") {
                length = (parseFloat(el.getAttribute("width") || "0") + parseFloat(el.getAttribute("height") || "0")) * 2;
              } else if (tag === "circle") {
                length = 2 * Math.PI * parseFloat(el.getAttribute("r") || "0");
              }
            }

            // Heuristic for cut (red stroke)
            const isRed = stroke.includes("red") || stroke.startsWith("#f00") || stroke.startsWith("#ff0000") || stroke.startsWith("rgb(255,0,0)");
            
            if (isRed && !isNone(stroke)) {
              totalCutLengthMm += length * scale;
            } else {
              // Everything else is engraving. 
              // We estimate engraving effort by summing bounding box areas of filled objects.
              const elBBox = el.getBBox();
              if (!isNone(fill) && fill !== "white" && fill !== "#fff" && fill !== "#ffffff") {
                totalEngraveAreaMm2 += elBBox.width * elBBox.height * scale * scale;
              } else if (!isNone(stroke)) {
                // If it's just a line (not red), we treat it as "line engraving" (simulated area)
                totalEngraveAreaMm2 += length * 0.5 * scale; // assume 0.5mm beam width
              }
            }
          });
        } finally {
          document.body.removeChild(container);
        }

        const finalW = widthMm || 100;
        const finalH = heightMm || 100;
        const finalCutLength = totalCutLengthMm;
        const finalEngraveArea = totalEngraveAreaMm2 / 100; // mm2 to cm2
        
        const specs = {
          widthMm: finalW,
          heightMm: finalH,
          cutLengthMm: finalCutLength,
          engraveAreaCm2: finalEngraveArea
        };

        setParsed({ 
          raw: text, 
          widthMm: specs.widthMm, 
          heightMm: specs.heightMm, 
          cutLengthMm: specs.cutLengthMm, 
          engraveAreaCm2: specs.engraveAreaCm2,
          aspectRatio: finalW / finalH
        });
        onSpecsDetected?.(specs);
      } catch (err) {
        console.error("SVG Analysis failed", err);
        setUnsupported("SVG");
      }
    });
  }, [file]);

  const handleManualScale = (val: string) => {
    setManualWidth(val);
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0 || !parsed?.aspectRatio) return;
    
    // val is in current unit, convert to mm
    const wMm = unit === "in" ? n * 25.4 : n;
    const originalWMm = parsed.widthMm || 1;
    const ratio = wMm / originalWMm;
    const hMm = wMm / parsed.aspectRatio;
    
    const specs = {
      widthMm: wMm,
      heightMm: hMm,
      cutLengthMm: parsed.cutLengthMm * ratio,
      engraveAreaCm2: parsed.engraveAreaCm2 * ratio * ratio
    };

    setParsed(p => p ? { ...p, ...specs } : null);
    onSpecsDetected?.(specs);
  };

  const sizeLabel = useMemo(() => {
    if (!parsed) return "";
    return `${formatUnit(fromMm(parsed.widthMm, unit), unit)} × ${formatUnit(fromMm(parsed.heightMm, unit), unit)}`;
  }, [parsed, unit]);

  if (!file) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Upload a file (SVG, PNG, JPG) to preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className="relative grid min-h-[22rem] place-items-center overflow-hidden rounded-3xl border border-border bg-slate-900 shadow-inner p-8"
      >
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        
        {parsed ? (
          parsed.isImage ? (
            <img src={parsed.raw} className="relative z-10 max-h-[18rem] w-auto drop-shadow-2xl" alt="Preview" />
          ) : (
            <div
              className="relative z-10 max-h-[18rem] w-full max-w-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] [&_svg]:h-auto [&_svg]:max-h-[18rem] [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: parsed.raw.replace(/<script[\s\S]*?<\/script>/gi, "") }}
            />
          )
        ) : unsupported ? (
          <div className="flex flex-col items-center gap-4 text-center text-sm text-slate-400">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-white uppercase tracking-tight">{unsupported} ready for quote</div>
              <p className="max-w-[240px] text-xs leading-relaxed">
                In-browser preview is limited for this format, but your file will be processed accurately by the maker.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium animate-pulse">
            <Scan className="h-4 w-4" /> Analyzing file content…
          </div>
        )}

        {/* Dynamic Scale Indicator */}
        {parsed && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
            <div className="h-[1px] flex-1 bg-white/20" />
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{sizeLabel}</div>
            <div className="h-[1px] flex-1 bg-white/20" />
          </div>
        )}
      </div>

      {parsed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Ruler className="h-3.5 w-3.5" />} label="Actual Size" value={sizeLabel} />
          <Stat icon={<Scan className="h-3.5 w-3.5" />} label="Cut Length" value={`${Math.round(parsed.cutLengthMm)}mm`} />
          <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Engrave Area" value={`${parsed.engraveAreaCm2.toFixed(1)}cm²`} />
          
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-primary">Scale target width ({unit})</Label>
              <Maximize className="h-3 w-3 text-primary" />
            </div>
            <Input
              type="number"
              placeholder="Resize..."
              value={manualWidth}
              onChange={(e) => handleManualScale(e.target.value)}
              className="mt-1 h-7 bg-background/50 border-primary/20 text-xs"
            />
          </div>
        </div>
      )}

      {!parsed?.isImage && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
          <div className="flex shrink-0 gap-1.5">
            <div className="h-2 w-3 rounded-sm bg-red-500" />
            <div className="h-2 w-3 rounded-sm bg-slate-300" />
          </div>
          <p>
            <span className="font-semibold text-foreground">Laser intelligence:</span> We detected <span className="text-foreground font-medium">{Math.round(parsed?.cutLengthMm || 0)}mm</span> of cutting paths. Red strokes are through-cuts, all other colors are engraved.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
