import { useEffect, useRef, useState } from "react";
import { Ruler, Sparkles, Layers } from "lucide-react";

type Props = { file: File | null };

type ParsedDst = {
  stitchCount: number;
  widthMm: number;
  heightMm: number;
  colorChanges: number;
  /** Sampled stitch points in mm relative to centre (for canvas preview). */
  points: { x: number; y: number; jump: boolean; colorChange: boolean }[];
};

/**
 * Tajima DST parser (subset, enough to draw a faithful preview).
 * Reference: each stitch is 3 bytes after the 512-byte ASCII header.
 */
function parseDst(buf: ArrayBuffer): ParsedDst {
  const u8 = new Uint8Array(buf);
  const headerText = new TextDecoder().decode(u8.slice(0, 512));
  const headerVal = (key: string) => {
    const m = headerText.match(new RegExp(`${key}:\\s*([^\\r\\n]+)`));
    return m ? m[1].trim() : "";
  };
  const declaredCount = parseInt(headerVal("ST")) || 0;
  const xPlus = parseInt(headerVal("+X")) || 0;
  const xMinus = parseInt(headerVal("-X")) || 0;
  const yPlus = parseInt(headerVal("+Y")) || 0;
  const yMinus = parseInt(headerVal("-Y")) || 0;
  // DST coordinates are in 0.1mm units.
  const widthMm = (xPlus + xMinus) / 10;
  const heightMm = (yPlus + yMinus) / 10;

  let x = 0;
  let y = 0;
  let stitches = 0;
  let colorChanges = 0;
  const points: ParsedDst["points"] = [{ x: 0, y: 0, jump: false, colorChange: false }];

  for (let i = 512; i + 2 < u8.length; i += 3) {
    const b1 = u8[i], b2 = u8[i + 1], b3 = u8[i + 2];
    // End-of-pattern
    if ((b3 & 0xf3) === 0xf3) break;
    const colorChange = (b3 & 0xc3) === 0xc3;
    const jump = (b3 & 0x83) === 0x83 && !colorChange;
    if (colorChange) colorChanges++;

    // Decode delta. Each axis is a 7-bit signed value packed across the 3 bytes.
    let dx = 0, dy = 0;
    // X
    if (b1 & 0x01) dx += 1;
    if (b1 & 0x02) dx -= 1;
    if (b1 & 0x04) dx += 9;
    if (b1 & 0x08) dx -= 9;
    if (b2 & 0x01) dx += 3;
    if (b2 & 0x02) dx -= 3;
    if (b2 & 0x04) dx += 27;
    if (b2 & 0x08) dx -= 27;
    if (b3 & 0x04) dx += 81;
    if (b3 & 0x08) dx -= 81;
    // Y (note: positive Y is up in DST → flip for canvas later)
    if (b1 & 0x80) dy += 1;
    if (b1 & 0x40) dy -= 1;
    if (b1 & 0x20) dy += 9;
    if (b1 & 0x10) dy -= 9;
    if (b2 & 0x80) dy += 3;
    if (b2 & 0x40) dy -= 3;
    if (b2 & 0x20) dy += 27;
    if (b2 & 0x10) dy -= 27;
    if (b3 & 0x20) dy += 81;
    if (b3 & 0x10) dy -= 81;

    x += dx;
    y += dy;
    stitches++;
    if (stitches % 3 === 0 || jump || colorChange) {
      // Sub-sample to keep canvas fast for large designs.
      points.push({ x: x / 10, y: y / 10, jump, colorChange });
    }
  }

  return {
    stitchCount: declaredCount || stitches,
    widthMm,
    heightMm,
    colorChanges,
    points,
  };
}

export default function EmbroideryPreview({ file }: Props) {
  const [parsed, setParsed] = useState<ParsedDst | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setParsed(null);
    setError(null);
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "dst") {
      setError(`${ext?.toUpperCase() ?? "File"} preview coming soon — quote still works below.`);
      return;
    }
    file.arrayBuffer().then((buf) => {
      try {
        setParsed(parseDst(buf));
      } catch {
        setError("Couldn't read this DST file.");
      }
    });
  }, [file]);

  useEffect(() => {
    if (!parsed || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const w = cvs.width = cvs.clientWidth * window.devicePixelRatio;
    const h = cvs.height = cvs.clientHeight * window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // Compute bounds from points so the preview always fits.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of parsed.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const pw = Math.max(1, maxX - minX);
    const ph = Math.max(1, maxY - minY);
    const pad = 20 * window.devicePixelRatio;
    const scale = Math.min((w - pad * 2) / pw, (h - pad * 2) / ph);
    const ox = (w - pw * scale) / 2 - minX * scale;
    const oy = (h - ph * scale) / 2 + maxY * scale; // flip Y

    const palette = ["#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
    let colorIdx = 0;
    ctx.lineWidth = 1.2 * window.devicePixelRatio;
    ctx.strokeStyle = palette[colorIdx];
    ctx.beginPath();
    let started = false;
    for (const p of parsed.points) {
      const cx = ox + p.x * scale;
      const cy = oy - p.y * scale;
      if (p.colorChange) {
        ctx.stroke();
        colorIdx = (colorIdx + 1) % palette.length;
        ctx.strokeStyle = palette[colorIdx];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        started = true;
      } else if (p.jump || !started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
  }, [parsed]);

  if (!file) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Upload a DST or PES file to preview your stitches
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-72 overflow-hidden rounded-3xl border border-border bg-gradient-hero">
        {parsed ? (
          <canvas ref={canvasRef} className="h-full w-full" />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
            {error ?? "Reading stitches…"}
          </div>
        )}
      </div>
      {parsed && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={<Sparkles className="h-3 w-3" />} label="Stitches" value={parsed.stitchCount.toLocaleString()} />
          <Stat icon={<Ruler className="h-3 w-3" />} label="Size" value={`${parsed.widthMm.toFixed(0)}×${parsed.heightMm.toFixed(0)} mm`} />
          <Stat icon={<Layers className="h-3 w-3" />} label="Colors" value={`${parsed.colorChanges + 1}`} />
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
