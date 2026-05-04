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
  if (s.id === "laser-cut") return { ...base, cutLengthMm: 800, engraveAreaCm2: 0, thicknessMm: 3 };
  if (s.id === "embroidery") return { ...base, stitchCount: 8000 };
  if (s.id === "cnc") return { ...base, machineMinutes: 30, thicknessMm: 12 };
  return base;
}

function ServiceFlow({ service }: { service: ServiceDef }) {
  const [file, setFile] = useState<File | null>(null);
  const [specs, setSpecs] = useState<Specs>(() => defaultSpecs(service));

  // Reset when service changes (component is keyed, but be defensive).
  useEffect(() => {
    setSpecs(defaultSpecs(service));
    setFile(null);
  }, [service]);

  const set = (patch: Partial<Specs>) => setSpecs((s) => ({ ...s, ...patch }));

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

        <SpecsPanel service={service} specs={specs} onChange={set} />
      </div>

      {/* RIGHT: estimator */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Estimator service={service} specs={specs} />
      </div>
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

function localEstimateCents(service: ServiceDef, s: Specs): { cents: number; breakdown: { label: string; cents: number }[] } {
  const breakdown: { label: string; cents: number }[] = [];
  let total = 0;
  const setupC = 150;
  breakdown.push({ label: "Setup", cents: setupC });
  total += setupC;

  switch (service.id) {
    case "laser-cut": {
      // $0.06 per cm of cut + $0.03 per cm² engrave + material fee from area
      const cutCm = (s.cutLengthMm ?? 0) / 10;
      const cutC = Math.round(cutCm * 6);
      const engC = Math.round((s.engraveAreaCm2 ?? 0) * 3);
      const areaCm2 = (s.widthMm * s.heightMm) / 100;
      const matC = Math.round(areaCm2 * 1.5 * (s.thicknessMm ?? 3) * 0.4);
      breakdown.push({ label: "Cutting", cents: cutC });
      if (engC) breakdown.push({ label: "Engraving", cents: engC });
      breakdown.push({ label: `Material (${s.material})`, cents: matC });
      total += cutC + engC + matC;
      break;
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

function Estimator({ service, specs }: { service: ServiceDef; specs: Specs }) {
  const { cents, breakdown } = useMemo(() => localEstimateCents(service, specs), [service, specs]);
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
