import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Upload as UploadIcon,
  Sparkles,
  Ruler,
  TrendingUp,
  ArrowRight,
  Info,
  Layers,
} from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import ServicePicker from "@/components/ServicePicker";
import SvgPreview from "@/components/SvgPreview";
import EmbroideryPreview from "@/components/EmbroideryPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getService, type ServiceDef } from "@/lib/services";
import { supabase } from "@/integrations/supabase/client";

const MIN_PRICE_CENTS = 200;

export default function Order() {
  const { service: serviceId } = useParams<{ service: string }>();
  const service = getService(serviceId);

  // 3D printing has its own dedicated, fully-featured slicer flow.
  if (serviceId === "3d-print") {
    return <Navigate to="/upload" replace />;
  }

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${service.name} — Local maker quotes in seconds | PrintLoco`}
        description={service.description}
        path={`/order/${service.id}`}
      />
      <Navbar />
      <PageTransition>
        <main className="container py-10">
          {/* Service switcher */}
          <ServicePicker active={service.id} />

          <AnimatePresence mode="wait">
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <ServiceFlow service={service} />
            </motion.div>
          </AnimatePresence>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
}

/* ----------------------------- Service flow ------------------------------- */

export type LaserMachine = {
  id: string;
  name: string;
  /** Working bed size mm */
  bedW: number;
  bedH: number;
  /** Common stock sheet size mm (what we buy material in) */
  sheetW: number;
  sheetH: number;
  /** Relative speed multiplier (1 = baseline) */
  speed: number;
  /** Total electrical draw at full power (watts) — used for electricity cost */
  watts: number;
  /** Realistic cut feed-rate at 3mm plywood (mm/min) */
  cutSpeedMmPerMin: number;
  /** Realistic engrave feed-rate (mm/min of stroke length) */
  engraveSpeedMmPerMin: number;
};

export const LASER_MACHINES: LaserMachine[] = [
  { id: "xtool-s1",   name: "xTool S1 (40W diode)",     bedW: 498, bedH: 319, sheetW: 600, sheetH: 400, speed: 1.0, watts: 160,  cutSpeedMmPerMin: 600,  engraveSpeedMmPerMin: 4000 },
  { id: "xtool-p2",   name: "xTool P2 (55W CO2)",       bedW: 600, bedH: 308, sheetW: 600, sheetH: 400, speed: 1.6, watts: 900,  cutSpeedMmPerMin: 1200, engraveSpeedMmPerMin: 9000 },
  { id: "xtool-m1",   name: "xTool M1 (10W diode)",     bedW: 385, bedH: 300, sheetW: 400, sheetH: 300, speed: 0.6, watts: 90,   cutSpeedMmPerMin: 250,  engraveSpeedMmPerMin: 3000 },
  { id: "xtool-f1",   name: "xTool F1 (Fiber + diode)", bedW: 115, bedH: 115, sheetW: 200, sheetH: 200, speed: 0.8, watts: 80,   cutSpeedMmPerMin: 300,  engraveSpeedMmPerMin: 6000 },
  { id: "glowforge",  name: "Glowforge Pro (45W CO2)",  bedW: 495, bedH: 279, sheetW: 500, sheetH: 300, speed: 1.4, watts: 800,  cutSpeedMmPerMin: 900,  engraveSpeedMmPerMin: 7500 },
  { id: "co2-100w",   name: "Generic 100W CO2",         bedW: 900, bedH: 600, sheetW: 1220, sheetH: 610, speed: 2.2, watts: 1500, cutSpeedMmPerMin: 1800, engraveSpeedMmPerMin: 12000 },
  { id: "fiber-50w",  name: "Fiber laser 50W (metal)",  bedW: 200, bedH: 200, sheetW: 300, sheetH: 300, speed: 1.8, watts: 700,  cutSpeedMmPerMin: 1500, engraveSpeedMmPerMin: 10000 },
  { id: "other",      name: "Other / unsure",           bedW: 500, bedH: 300, sheetW: 600, sheetH: 400, speed: 1.0, watts: 400,  cutSpeedMmPerMin: 800,  engraveSpeedMmPerMin: 6000 },
];

/** Default $/kWh — overridable in the inline settings (stored in localStorage). */
export const DEFAULT_KWH_RATE = 0.18;
/** Flat material cost per stock sheet (USD). */
export const SHEET_COST_USD = 1.9;

function useElectricityRate(): [number, (v: number) => void] {
  const [rate, setRate] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_KWH_RATE;
    const v = parseFloat(localStorage.getItem("printloco.kwhRate") ?? "");
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_KWH_RATE;
  });
  const update = (v: number) => {
    setRate(v);
    try { localStorage.setItem("printloco.kwhRate", String(v)); } catch {}
  };
  return [rate, update];
}

/** A layer = a unique stroke color in the uploaded vector, with a chosen action. */
export type LaserLayer = {
  color: string;
  pathCount: number;
  /** Approximate total length of paths in mm at the SVG's mm scale */
  lengthMm: number;
  action: "cut" | "engrave" | "skip";
};

type Specs = {
  material: string;
  preset: string;
  quantity: number;
  // dimensions (mm)
  widthMm: number;
  heightMm: number;
  // service-specific knobs
  cutLengthMm?: number; // laser
  engraveAreaCm2?: number; // laser
  machineId?: string; // laser
  layers?: LaserLayer[]; // laser
  autoMeasured?: boolean; // laser — true when dims/length came from file
  /** Raw user-unit numbers from the source file (svg user units). Lets us rescale to mm/cm/in. */
  rawW?: number;
  rawH?: number;
  rawLen?: number;
  /** What unit the file was actually authored in. Default "mm" (CAD standard). */
  sourceUnit?: "mm" | "cm" | "in" | "px";
  stitchCount?: number; // embroidery
  machineMinutes?: number; // cnc
  thicknessMm?: number; // cnc / laser
  rush: boolean;
  notes: string;
};

function defaultSpecs(s: ServiceDef): Specs {
  const base: Specs = {
    material: s.materials[0],
    preset: s.qualityPresets[0].id,
    quantity: 1,
    widthMm: 100,
    heightMm: 100,
    rush: false,
    notes: "",
  };
  if (s.id === "laser-cut")
    return {
      ...base,
      cutLengthMm: 800,
      engraveAreaCm2: 0,
      thicknessMm: 3,
      machineId: LASER_MACHINES[0].id,
      layers: [],
      autoMeasured: false,
      sourceUnit: "mm",
    };
  if (s.id === "embroidery") return { ...base, stitchCount: 8000 };
  if (s.id === "cnc") return { ...base, machineMinutes: 30, thicknessMm: 12 };
  return base;
}

const UNIT_TO_MM: Record<NonNullable<Specs["sourceUnit"]>, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  px: 25.4 / 96,
};

function ServiceFlow({ service }: { service: ServiceDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [specs, setSpecs] = useState<Specs>(() => defaultSpecs(service));
  const [kwhRate, setKwhRate] = useElectricityRate();
  // Reset when service changes (component is keyed, but be defensive).
  useEffect(() => {
    setSpecs(defaultSpecs(service));
    setFile(null);
  }, [service]);

  const set = (patch: Partial<Specs>) => setSpecs((s) => ({ ...s, ...patch }));

  // Auto-measure laser uploads (SVG → real dims & path lengths; raster → image dims at 96 DPI).
  useEffect(() => {
    if (service.id !== "laser-cut" || !file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    let cancelled = false;
    if (ext === "svg") {
      file.text().then((text) => {
        if (cancelled) return;
        const measured = measureSvg(text);
        if (!measured) return;
        const layers: LaserLayer[] = measured.colors.map((c) => ({
          ...c,
          action: isReddish(c.color) ? "cut" : "engrave",
        }));
        const cutLen = layers
          .filter((l) => l.action === "cut")
          .reduce((a, l) => a + l.lengthMm, 0);
        const engLen = layers
          .filter((l) => l.action === "engrave")
          .reduce((a, l) => a + l.lengthMm, 0);
        const unit = measured.detectedUnit;
        const factor = UNIT_TO_MM[unit];
        set({
          widthMm: Math.max(1, Math.round(measured.rawW * factor)),
          heightMm: Math.max(1, Math.round(measured.rawH * factor)),
          rawW: measured.rawW,
          rawH: measured.rawH,
          rawLen: cutLen / factor, // store raw user-units so unit override rescales correctly
          sourceUnit: unit,
          layers,
          cutLengthMm: Math.round(cutLen),
          // rough engrave area: stroke length × 0.5mm beam width → cm²
          engraveAreaCm2: Math.round(((engLen * 0.5) / 100) * 10) / 10,
          autoMeasured: true,
        });
      });
    } else if (["png", "jpg", "jpeg"].includes(ext ?? "")) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        // Raster has no real-world dims; assume 96 DPI as a starting point. User can switch unit.
        const wPx = img.naturalWidth || 100;
        const hPx = img.naturalHeight || 100;
        const factor = UNIT_TO_MM.px;
        set({
          widthMm: Math.max(1, Math.round(wPx * factor)),
          heightMm: Math.max(1, Math.round(hPx * factor)),
          rawW: wPx,
          rawH: hPx,
          rawLen: 0,
          sourceUnit: "px",
          autoMeasured: true,
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, service.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT: upload + preview + specs */}
      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{service.emoji}</span>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {service.name}
              </h1>
              <p className="text-sm text-muted-foreground">{service.tagline}</p>
            </div>
          </div>
        </header>

        <FileDropzone service={service} file={file} onFile={setFile} />

        <PreviewSwitch service={service} file={file} />

        {service.id === "laser-cut" && (
          <LaserMachinePanel specs={specs} onChange={set} kwhRate={kwhRate} setKwhRate={setKwhRate} />
        )}

        {service.id === "laser-cut" && (specs.layers?.length ?? 0) > 0 && (
          <LayerMappingPanel specs={specs} onChange={set} />
        )}

        <SpecsPanel service={service} specs={specs} onChange={set} />
      </div>

      {/* RIGHT: estimator */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Estimator service={service} specs={specs} kwhRate={kwhRate} />
      </div>
    </div>
  );
}

/* ----------------------------- SVG measurement ---------------------------- */

function isReddish(color: string): boolean {
  const c = color.toLowerCase().trim();
  if (c === "red") return true;
  const m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return false;
  let r: number, g: number, b: number;
  if (m[1].length === 3) {
    r = parseInt(m[1][0] + m[1][0], 16);
    g = parseInt(m[1][1] + m[1][1], 16);
    b = parseInt(m[1][2] + m[1][2], 16);
  } else {
    r = parseInt(m[1].slice(0, 2), 16);
    g = parseInt(m[1].slice(2, 4), 16);
    b = parseInt(m[1].slice(4, 6), 16);
  }
  return r > 150 && g < 100 && b < 100;
}

function measureSvg(text: string): {
  widthMm: number;
  heightMm: number;
  /** Raw user-unit width/height from the viewBox (what the file thinks the canvas is). */
  rawW: number;
  rawH: number;
  /** Inferred source unit. */
  detectedUnit: "mm" | "cm" | "in" | "px";
  colors: { color: string; pathCount: number; lengthMm: number }[];
} | null {
  try {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return null;

    const wAttr = svg.getAttribute("width");
    const hAttr = svg.getAttribute("height");
    const vb = svg.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);

    // Detect unit from explicit suffix on width attr; default to mm (CAD standard) when ambiguous.
    let detectedUnit: "mm" | "cm" | "in" | "px" = "mm";
    if (wAttr) {
      if (/in\s*$/.test(wAttr)) detectedUnit = "in";
      else if (/cm\s*$/.test(wAttr)) detectedUnit = "cm";
      else if (/mm\s*$/.test(wAttr)) detectedUnit = "mm";
      else if (/px\s*$/.test(wAttr) || /^\d+(\.\d+)?$/.test(wAttr.trim())) {
        // Bare number — Inkscape writes mm by default but most browser-exported SVGs are px.
        detectedUnit = "px";
      }
    } else {
      detectedUnit = "px"; // no width attr → viewBox only, treat as px
    }

    const parseSize = (v: string | null): number => {
      if (!v) return 0;
      const n = parseFloat(v);
      if (Number.isNaN(n)) return 0;
      if (/in\s*$/.test(v)) return n * 25.4;
      if (/cm\s*$/.test(v)) return n * 10;
      if (/mm\s*$/.test(v)) return n;
      return (n / 96) * 25.4; // px → mm @ 96dpi
    };
    let widthMm = parseSize(wAttr);
    let heightMm = parseSize(hAttr);
    let rawW = parseFloat(wAttr ?? "") || 0;
    let rawH = parseFloat(hAttr ?? "") || 0;
    let scale = 25.4 / 96;
    if (vb && vb.length === 4) {
      if (!rawW) rawW = vb[2];
      if (!rawH) rawH = vb[3];
      if (!widthMm) widthMm = (vb[2] / 96) * 25.4;
      if (!heightMm) heightMm = (vb[3] / 96) * 25.4;
      if (vb[2] > 0) scale = widthMm / vb[2];
    }

    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.left = "-99999px";
    host.innerHTML = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    document.body.appendChild(host);
    const live = host.querySelector("svg") as SVGSVGElement | null;
    const colorMap = new Map<string, { pathCount: number; lengthMm: number }>();
    if (live) {
      const els = live.querySelectorAll<SVGGeometryElement>(
        "path,line,polyline,polygon,rect,circle,ellipse",
      );
      els.forEach((el) => {
        const stroke = (el.getAttribute("stroke") || el.style.stroke || "#000000").toLowerCase();
        const norm = normalizeColor(stroke);
        const len = safeLength(el) * scale;
        const cur = colorMap.get(norm) ?? { pathCount: 0, lengthMm: 0 };
        cur.pathCount += 1;
        cur.lengthMm += len;
        colorMap.set(norm, cur);
      });
    }
    document.body.removeChild(host);

    const colors = Array.from(colorMap.entries())
      .map(([color, v]) => ({ color, pathCount: v.pathCount, lengthMm: v.lengthMm }))
      .sort((a, b) => b.lengthMm - a.lengthMm);

    return {
      widthMm: widthMm || 100,
      heightMm: heightMm || 100,
      rawW: rawW || 100,
      rawH: rawH || 100,
      detectedUnit,
      colors,
    };
  } catch {
    return null;
  }
}

function safeLength(el: SVGGeometryElement): number {
  try {
    return el.getTotalLength?.() ?? 0;
  } catch {
    return 0;
  }
}

function normalizeColor(c: string): string {
  c = c.trim();
  if (!c || c === "none") return "#000000";
  if (c.startsWith("#")) {
    if (c.length === 4) return ("#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
    return c.toLowerCase();
  }
  // named → use a temp element
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#000000";
  ctx.fillStyle = "#000000";
  ctx.fillStyle = c;
  return ctx.fillStyle.toLowerCase();
}

/* ----------------------------- Machine panel ------------------------------ */

function LaserMachinePanel({
  specs,
  onChange,
  kwhRate,
  setKwhRate,
}: {
  specs: Specs;
  onChange: (p: Partial<Specs>) => void;
  kwhRate: number;
  setKwhRate: (v: number) => void;
}) {
  const machine = LASER_MACHINES.find((m) => m.id === specs.machineId) ?? LASER_MACHINES[0];
  const fits = specs.widthMm <= machine.bedW && specs.heightMm <= machine.bedH;
  const currentUnit = specs.sourceUnit ?? "mm";
  const applyUnit = (u: NonNullable<Specs["sourceUnit"]>) => {
    const factor = UNIT_TO_MM[u];
    if (specs.rawW && specs.rawH) {
      onChange({
        sourceUnit: u,
        widthMm: Math.max(1, Math.round(specs.rawW * factor)),
        heightMm: Math.max(1, Math.round(specs.rawH * factor)),
        cutLengthMm:
          specs.rawLen != null ? Math.round(specs.rawLen * factor) : specs.cutLengthMm,
      });
    } else {
      onChange({ sourceUnit: u });
    }
  };
  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Machine</h2>
        <span className="text-[11px] text-muted-foreground">
          Bed {machine.bedW}×{machine.bedH} mm · Sheet {machine.sheetW}×{machine.sheetH} mm · {machine.watts} W
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LASER_MACHINES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange({ machineId: m.id })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              specs.machineId === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Source-unit override — fixes wrong dim detection from headerless SVGs */}
      {specs.autoMeasured && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold">File dimensions look wrong?</div>
              <div className="text-[11px] text-muted-foreground">
                Auto-detected as <span className="font-semibold">{currentUnit}</span>. If the part
                should be bigger or smaller, switch the unit your file was authored in.
              </div>
            </div>
            <div className="flex gap-1">
              {(["mm", "cm", "in", "px"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => applyUnit(u)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors ${
                    currentUnit === u
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          {specs.rawW && specs.rawH && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Raw file canvas: {specs.rawW.toFixed(1)} × {specs.rawH.toFixed(1)} user-units →{" "}
              <span className="font-semibold text-foreground">
                {specs.widthMm} × {specs.heightMm} mm
              </span>
            </div>
          )}
        </div>
      )}

      {/* Electricity rate setting — drives the cutting machine cost */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3">
        <div>
          <div className="text-xs font-semibold">Electricity rate</div>
          <div className="text-[11px] text-muted-foreground">
            Used to compute machine cost = run time × wattage × rate. Saved on this device.
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={kwhRate}
            onChange={(e) => setKwhRate(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-20"
          />
          <span className="text-xs text-muted-foreground">/ kWh</span>
        </div>
      </div>

      {!fits && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
          Your part ({specs.widthMm}×{specs.heightMm} mm) is larger than this machine's bed. Pick a
          bigger machine or split the design.
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Layer mapping ------------------------------ */

function LayerMappingPanel({
  specs,
  onChange,
}: {
  specs: Specs;
  onChange: (p: Partial<Specs>) => void;
}) {
  const layers = specs.layers ?? [];
  const update = (idx: number, action: LaserLayer["action"]) => {
    const next = layers.map((l, i) => (i === idx ? { ...l, action } : l));
    const cutLen = next.filter((l) => l.action === "cut").reduce((a, l) => a + l.lengthMm, 0);
    const engLen = next.filter((l) => l.action === "engrave").reduce((a, l) => a + l.lengthMm, 0);
    onChange({
      layers: next,
      cutLengthMm: Math.round(cutLen),
      engraveAreaCm2: Math.round(((engLen * 0.5) / 100) * 10) / 10,
    });
  };
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Layers detected</h2>
        <span className="text-[11px] text-muted-foreground">
          Auto-measured from your file — adjust per color
        </span>
      </div>
      <ul className="space-y-2">
        {layers.map((l, i) => (
          <li
            key={l.color + i}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-5 w-5 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: l.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{l.color}</div>
                <div className="text-[10px] text-muted-foreground">
                  {l.pathCount} path{l.pathCount === 1 ? "" : "s"} · {(l.lengthMm / 10).toFixed(1)} cm
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {(["cut", "engrave", "skip"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => update(i, a)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                    l.action === a
                      ? a === "cut"
                        ? "border-red-500 bg-red-500 text-white"
                        : a === "engrave"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted text-muted-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- File dropzone ------------------------------ */

function FileDropzone({
  service,
  file,
  onFile,
}: {
  service: ServiceDef;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${
        drag ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:bg-card"
      }`}
    >
      <input
        type="file"
        className="absolute inset-0 cursor-pointer opacity-0"
        accept={service.acceptedFiles.join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UploadIcon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-display text-lg font-semibold">
        {file ? file.name : `Drop your ${service.shortName.toLowerCase()} file`}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{service.fileHint}</div>
      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onFile(null);
          }}
          className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Replace file
        </button>
      )}
    </label>
  );
}

/* ----------------------------- Preview switch ----------------------------- */

function PreviewSwitch({ service, file }: { service: ServiceDef; file: File | null }) {
  if (service.previewKind === "svg") return <SvgPreview file={file} />;
  if (service.previewKind === "embroidery") return <EmbroideryPreview file={file} />;
  // STL preview for CNC — keep light for now; CNC users typically know dims.
  return (
    <div className="grid h-48 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
      {file ? `${file.name} ready — quote uses your specs below` : "Upload a file to begin"}
    </div>
  );
}

/* ----------------------------- Specs panel -------------------------------- */

function SpecsPanel({
  service,
  specs,
  onChange,
}: {
  service: ServiceDef;
  specs: Specs;
  onChange: (p: Partial<Specs>) => void;
}) {
  return (
    <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-semibold">Job details</h2>

      {/* Material */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Material</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {service.materials.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ material: m })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                specs.material === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Quality preset */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quality</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {service.qualityPresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ preset: p.id })}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-colors ${
                specs.preset === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div className="text-lg">{p.emoji}</div>
              <div className="mt-1 text-sm font-semibold">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={500}
            value={specs.quantity}
            onChange={(e) =>
              onChange({ quantity: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })
            }
            className="h-9 w-24"
          />
        </div>
      </div>

      {/* Service-specific knobs */}
      {service.id === "laser-cut" && (
        <>
          <Pair>
            <NumField label="Width (mm)" value={specs.widthMm} onChange={(v) => onChange({ widthMm: v })} />
            <NumField label="Height (mm)" value={specs.heightMm} onChange={(v) => onChange({ heightMm: v })} />
          </Pair>
          <Pair>
            <NumField label="Total cut length (mm)" value={specs.cutLengthMm ?? 0} onChange={(v) => onChange({ cutLengthMm: v })} />
            <NumField label="Engrave area (cm²)" value={specs.engraveAreaCm2 ?? 0} onChange={(v) => onChange({ engraveAreaCm2: v })} />
          </Pair>
        </>
      )}

      {service.id === "embroidery" && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stitch count</Label>
              <span className="text-sm font-semibold">{specs.stitchCount?.toLocaleString()}</span>
            </div>
            <Slider
              value={[specs.stitchCount ?? 0]}
              min={500}
              max={50000}
              step={500}
              onValueChange={([v]) => onChange({ stitchCount: v })}
              className="mt-2"
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              Auto-detected from DST when you upload one. Bigger designs = more stitches.
            </div>
          </div>
          <Pair>
            <NumField label="Width (mm)" value={specs.widthMm} onChange={(v) => onChange({ widthMm: v })} />
            <NumField label="Height (mm)" value={specs.heightMm} onChange={(v) => onChange({ heightMm: v })} />
          </Pair>
        </>
      )}

      {service.id === "cnc" && (
        <>
          <Pair>
            <NumField label="Width (mm)" value={specs.widthMm} onChange={(v) => onChange({ widthMm: v })} />
            <NumField label="Height (mm)" value={specs.heightMm} onChange={(v) => onChange({ heightMm: v })} />
          </Pair>
          <Pair>
            <NumField label="Stock thickness (mm)" value={specs.thicknessMm ?? 0} onChange={(v) => onChange({ thicknessMm: v })} />
            <NumField label="Est. machine time (min)" value={specs.machineMinutes ?? 0} onChange={(v) => onChange({ machineMinutes: v })} />
          </Pair>
        </>
      )}

      {service.id === "vinyl" && (
        <Pair>
          <NumField label="Width (mm)" value={specs.widthMm} onChange={(v) => onChange({ widthMm: v })} />
          <NumField label="Height (mm)" value={specs.heightMm} onChange={(v) => onChange({ heightMm: v })} />
        </Pair>
      )}

      {/* Rush + notes */}
      <label className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-3">
        <div>
          <div className="text-sm font-semibold">Rush job (+25%)</div>
          <div className="text-[11px] text-muted-foreground">Bumped to the front of the maker's queue.</div>
        </div>
        <input
          type="checkbox"
          checked={specs.rush}
          onChange={(e) => onChange({ rush: e.target.checked })}
          className="h-5 w-5 accent-primary"
        />
      </label>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes for the maker</Label>
        <textarea
          value={specs.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          placeholder="Anything they should know? Color preference, deadline, finishing…"
          className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-2 h-9"
      />
    </div>
  );
}

/* ------------------------------ Estimator --------------------------------- */

function localEstimateCents(
  service: ServiceDef,
  s: Specs,
  kwhRate: number = DEFAULT_KWH_RATE,
): { cents: number; breakdown: { label: string; cents: number }[] } {
  const breakdown: { label: string; cents: number }[] = [];
  let total = 0;
  const setupC = 150;
  breakdown.push({ label: "Setup", cents: setupC });
  total += setupC;

  switch (service.id) {
    case "laser-cut": {
      const machine = LASER_MACHINES.find((m) => m.id === s.machineId) ?? LASER_MACHINES[0];

      // --- Time on machine (per piece) ---
      // Slow down cuts for thicker stock: 3mm baseline, doubles every +3mm.
      const thickness = s.thicknessMm ?? 3;
      const thickFactor = Math.max(1, thickness / 3);
      const cutMin = (s.cutLengthMm ?? 0) / Math.max(60, machine.cutSpeedMmPerMin / thickFactor);
      // engrave area cm² → ~stroke mm equivalent (× 200) at engrave feed
      const engMin = ((s.engraveAreaCm2 ?? 0) * 200) / Math.max(60, machine.engraveSpeedMmPerMin);
      const totalRunMin = (cutMin + engMin) * s.quantity;

      // --- Electricity (machine) cost — kWh × $/kWh ---
      const kWh = (totalRunMin / 60) * (machine.watts / 1000);
      const elecC = Math.max(1, Math.round(kWh * kwhRate * 100));

      // --- Sheet packing ---
      const gap = 5;
      const perRow = Math.max(1, Math.floor((machine.sheetW + gap) / (s.widthMm + gap)));
      const perCol = Math.max(1, Math.floor((machine.sheetH + gap) / (s.heightMm + gap)));
      const partsPerSheet = Math.max(1, perRow * perCol);
      const sheets = Math.ceil(s.quantity / partsPerSheet);
      const matC = Math.round(SHEET_COST_USD * 100) * sheets;

      breakdown.push({
        label: `Machine time — ${totalRunMin.toFixed(1)} min @ ${machine.watts}W`,
        cents: elecC,
      });
      breakdown.push({
        label: `Material — ${sheets} sheet${sheets === 1 ? "" : "s"} (${partsPerSheet}/sheet)`,
        cents: matC,
      });

      total = setupC + elecC + matC;
      if (s.rush) total = Math.round(total * 1.25);
      total = Math.round(total * 1.1); // platform + processing
      return { cents: Math.max(MIN_PRICE_CENTS, total), breakdown };
    }
    case "embroidery": {
      const per1k = 80; // 80¢ per 1k stitches
      const stitchC = Math.round(((s.stitchCount ?? 0) / 1000) * per1k);
      const hoopC = 200;
      breakdown.push({ label: "Stitching", cents: stitchC });
      breakdown.push({ label: "Hooping", cents: hoopC });
      total += stitchC + hoopC;
      break;
    }
    case "cnc": {
      const machineC = Math.round((s.machineMinutes ?? 0) * 25); // $0.25/min
      const stockC = Math.round(((s.widthMm * s.heightMm * (s.thicknessMm ?? 1)) / 1000) * 8);
      breakdown.push({ label: "Machine time", cents: machineC });
      breakdown.push({ label: `Stock (${s.material})`, cents: stockC });
      total += machineC + stockC;
      break;
    }
    case "vinyl": {
      const areaCm2 = (s.widthMm * s.heightMm) / 100;
      const mediaC = Math.round(areaCm2 * 4);
      breakdown.push({ label: `Media (${s.material})`, cents: mediaC });
      total += mediaC;
      break;
    }
    default:
      break;
  }

  total *= s.quantity;
  if (s.rush) total = Math.round(total * 1.25);
  total = Math.round(total * 1.1); // platform + processing
  total = Math.max(MIN_PRICE_CENTS, total);
  return { cents: total, breakdown };
}

type Research = {
  marketLowCents: number;
  marketTypicalCents: number;
  marketHighCents: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  sources: string[];
};

function Estimator({ service, specs, kwhRate = DEFAULT_KWH_RATE }: { service: ServiceDef; specs: Specs; kwhRate?: number }) {
  const { cents, breakdown } = useMemo(() => localEstimateCents(service, specs, kwhRate), [service, specs, kwhRate]);
  const [research, setResearch] = useState<Research | null>(null);
  const [finalCents, setFinalCents] = useState<number>(cents);
  const [loading, setLoading] = useState(false);

  // Invalidate research when inputs change
  useEffect(() => {
    setResearch(null);
    setFinalCents(cents);
  }, [cents]);

  const minimumApplied = cents <= MIN_PRICE_CENTS;
  const perUnit = Math.round(finalCents / Math.max(1, specs.quantity));

  async function refine() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-cost", {
        body: {
          service: service.dbKey,
          material: specs.material,
          quantity: specs.quantity,
          dims: { widthMm: specs.widthMm, heightMm: specs.heightMm, thicknessMm: specs.thicknessMm },
          options: {
            preset: specs.preset,
            cutLengthMm: specs.cutLengthMm,
            engraveAreaCm2: specs.engraveAreaCm2,
            stitchCount: specs.stitchCount,
            machineMinutes: specs.machineMinutes,
          },
          rush: specs.rush,
          research: true,
          localCents: cents,
        },
      });
      if (error) throw error;
      const d = data as { finalCents?: number; market?: Research | null };
      if (d?.market) setResearch(d.market);
      if (typeof d?.finalCents === "number") setFinalCents(Math.max(MIN_PRICE_CENTS, d.finalCents));
      toast.success("Refined with market research");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch market data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl bg-gradient-hero p-6 shadow-card">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {research ? "Researched estimate" : "Live estimate"}
        </div>
        <div className="mt-1 font-display text-5xl font-semibold leading-none">
          ${(finalCents / 100).toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          ${(perUnit / 100).toFixed(2)} / unit · {specs.quantity} ×
        </div>
        {minimumApplied && (
          <div className="mt-1 text-[11px] font-medium text-primary">From $2.00 minimum</div>
        )}
      </div>

      {/* Breakdown */}
      <div className="rounded-2xl border border-border bg-background/60 p-3 text-xs">
        <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3 w-3" /> What's included
        </div>
        <ul className="space-y-1">
          {breakdown.map((b) => (
            <li key={b.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-medium">${(b.cents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Research panel */}
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        {!research ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Fair-price check.</span>{" "}
              Compare against real maker shop pricing.
            </div>
            <Button size="sm" variant="outline" onClick={refine} disabled={loading} className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {loading ? "Researching…" : "Refine with research"}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Market range
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  {research.confidence}
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
            <RangeBar
              lowCents={research.marketLowCents}
              typicalCents={research.marketTypicalCents}
              highCents={research.marketHighCents}
              youCents={finalCents}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">{research.rationale}</p>
            {research.sources?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {research.sources.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* CTA */}
      <Button variant="hero" size="lg" className="w-full" asChild>
        <Link to="/auth?mode=signup">
          Find a local maker <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex items-start gap-2 rounded-2xl border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>
          Estimates blend our local pricing math with market research from comparable maker shops.
          Final price is set when you confirm with a maker.
        </span>
      </div>
    </div>
  );
}

function RangeBar({
  lowCents,
  typicalCents,
  highCents,
  youCents,
}: {
  lowCents: number;
  typicalCents: number;
  highCents: number;
  youCents: number;
}) {
  const span = Math.max(1, highCents - lowCents);
  const pct = (c: number) => Math.max(0, Math.min(100, ((c - lowCents) / span) * 100));
  return (
    <div className="relative">
      <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500/40 via-primary/40 to-rose-500/40" />
      <div
        className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary-foreground bg-primary shadow-soft"
        style={{ left: `${pct(youCents)}%` }}
        aria-label="Your price"
      />
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>Low ${(lowCents / 100).toFixed(0)}</span>
        <span>Typical ${(typicalCents / 100).toFixed(0)}</span>
        <span>High ${(highCents / 100).toFixed(0)}</span>
      </div>
    </div>
  );
}
