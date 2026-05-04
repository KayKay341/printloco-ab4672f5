import { useEffect, useMemo, useRef, useState } from "react";
import { Ruler, Scan, AlertCircle } from "lucide-react";

type Props = {
  file: File | null;
};

type ParsedSvg = {
  raw: string;
  widthMm: number;
  heightMm: number;
  cutLines: number;
  engraveLines: number;
};

/**
 * Lightweight in-browser SVG/DXF/PDF preview.
 * - SVG: parsed for size + colored stroke heuristic (red = cut, black = engrave).
 * - DXF / PDF: shows a friendly placeholder; the real file is still passed to the maker.
 */
export default function SvgPreview({ file }: Props) {
  const [parsed, setParsed] = useState<ParsedSvg | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParsed(null);
    setUnsupported(null);
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "svg") {
      setUnsupported(ext?.toUpperCase() ?? "file");
      return;
    }
    file.text().then((text) => {
      try {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) throw new Error("no svg element");
        // Try width/height attrs, fall back to viewBox.
        const parseSize = (v: string | null): number => {
          if (!v) return 0;
          const n = parseFloat(v);
          if (Number.isNaN(n)) return 0;
          if (v.endsWith("in")) return n * 25.4;
          if (v.endsWith("cm")) return n * 10;
          if (v.endsWith("mm")) return n;
          // assume px → 96 dpi
          return (n / 96) * 25.4;
        };
        let widthMm = parseSize(svg.getAttribute("width"));
        let heightMm = parseSize(svg.getAttribute("height"));
        if (!widthMm || !heightMm) {
          const vb = svg.getAttribute("viewBox")?.split(/\s+/);
          if (vb && vb.length === 4) {
            widthMm = (parseFloat(vb[2]) / 96) * 25.4;
            heightMm = (parseFloat(vb[3]) / 96) * 25.4;
          }
        }
        let cutLines = 0;
        let engraveLines = 0;
        svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((el) => {
          const stroke = (el.getAttribute("stroke") || "").toLowerCase();
          if (stroke.includes("red") || stroke.startsWith("#f") || stroke.startsWith("#e")) {
            cutLines++;
          } else {
            engraveLines++;
          }
        });
        setParsed({ raw: text, widthMm, heightMm, cutLines, engraveLines });
      } catch {
        setUnsupported("SVG");
      }
    });
  }, [file]);

  const sizeLabel = useMemo(() => {
    if (!parsed) return "";
    return `${parsed.widthMm.toFixed(1)} × ${parsed.heightMm.toFixed(1)} mm  ·  ${(
      parsed.widthMm / 25.4
    ).toFixed(2)} × ${(parsed.heightMm / 25.4).toFixed(2)} in`;
  }, [parsed]);

  if (!file) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Upload a vector file to preview
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={wrapRef}
        className="relative grid min-h-[18rem] place-items-center overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6"
      >
        {parsed ? (
          <div
            className="max-h-72 w-full max-w-full [&_svg]:h-auto [&_svg]:max-h-72 [&_svg]:w-auto [&_svg]:max-w-full"
            // Sandboxed: the SVG is rendered as inline markup, but we strip scripts.
            dangerouslySetInnerHTML={{ __html: parsed.raw.replace(/<script[\s\S]*?<\/script>/gi, "") }}
          />
        ) : unsupported ? (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div className="font-medium text-foreground">{unsupported} preview not available in-browser</div>
            <div className="max-w-xs">Your file will be sent to the maker as-is. Quote uses the dimensions you enter below.</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Parsing…</div>
        )}
      </div>

      {parsed && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={<Ruler className="h-3 w-3" />} label="Size" value={sizeLabel} />
          <Stat icon={<Scan className="h-3 w-3" />} label="Cut paths" value={`${parsed.cutLines}`} />
          <Stat icon={<Scan className="h-3 w-3" />} label="Engrave paths" value={`${parsed.engraveLines}`} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/60 p-3 text-[11px] text-muted-foreground">
        <span className="mr-2 inline-block h-2 w-3 rounded-sm bg-red-500 align-middle" /> Red strokes = cut
        <span className="mx-2 ml-4 inline-block h-2 w-3 rounded-sm bg-foreground align-middle" /> Other strokes = engrave
      </div>
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
