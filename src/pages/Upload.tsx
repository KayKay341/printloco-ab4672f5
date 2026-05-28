import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileBox,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Ruler,
  Settings2,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
  Weight,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import PrinterMatches from "@/components/PrinterMatches";
import SEO from "@/components/SEO";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import StlPreview from "@/components/StlPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parse3mf } from "@/lib/threeMfParser";
import {
  DEFAULT_SLICER_SETTINGS,
  MATERIAL_DEFAULTS,
  calculateSlicerStats,
  formatDuration,
  generateBasicGcode,
  geometryToModelInfo,
  safeBaseName,
  settingsToText,
  transformGeometryForSlicer,
  type ModelInfo,
  type SlicerSettings,
  type SlicerStats,
} from "@/lib/slicerEstimator";

type ModelFile = {
  name: string;
  extension: "stl" | "obj" | "3mf";
  geometry: THREE.BufferGeometry;
};

const SETTINGS_KEY = "printloco-slicer-settings";

/** Beginner-friendly quality presets — plain English, no jargon. */
const QUALITY_PRESETS = [
  {
    id: "draft",
    name: "Quick Draft",
    description: "Fastest print. Best for testing how a model fits.",
    emoji: "⚡",
    settings: { layerHeight: 0.3, infill: 10, speed: 70 },
  },
  {
    id: "standard",
    name: "Standard",
    description: "Balanced quality and speed. A great default.",
    emoji: "✨",
    settings: { layerHeight: 0.2, infill: 20, speed: 50 },
  },
  {
    id: "detailed",
    name: "Detailed",
    description: "Smoother surface for figurines and display pieces.",
    emoji: "🎨",
    settings: { layerHeight: 0.12, infill: 25, speed: 40 },
  },
  {
    id: "strong",
    name: "Strong & Durable",
    description: "Heavy infill for tools, brackets, and parts that bear weight.",
    emoji: "🛠️",
    settings: { layerHeight: 0.2, infill: 60, speed: 45 },
  },
] as const;

const MATERIAL_INFO: Record<SlicerSettings["material"], { label: string; description: string }> = {
  PLA: { label: "PLA — Easy", description: "Easiest to print. Great for decor, toys, and prototypes." },
  PETG: { label: "PETG — Tough", description: "Stronger and slightly flexible. Good for outdoor parts." },
  ABS: { label: "ABS — Heat-resistant", description: "For hot environments. Needs an enclosed printer." },
};

const Upload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<ModelFile | null>(null);
  const [settings, setSettings] = useState<SlicerSettings>(() => loadSettings());
  const [activePreset, setActivePreset] = useState<string>("standard");
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("settings");
    if (!shared) return;
    try {
      const decoded = JSON.parse(atob(shared)) as SlicerSettings;
      setSettings(sanitizeSettings(decoded));
      toast.success("Shared settings loaded");
    } catch {
      toast.error("Could not load shared settings");
    }
  }, []);

  const previewGeometry = useMemo(() => {
    if (!model) return null;
    return transformGeometryForSlicer(model.geometry, rotation);
  }, [model, rotation]);

  const modelInfo: ModelInfo | null = useMemo(() => {
    if (!previewGeometry) return null;
    return geometryToModelInfo(previewGeometry);
  }, [previewGeometry]);

  const stats: SlicerStats | null = useMemo(
    () => calculateSlicerStats(modelInfo, settings),
    [modelInfo, settings],
  );

  const tips = useMemo(() => {
    const list: string[] = [];
    if (!stats) return list;
    if (stats.printMinutes > 480) list.push("Heads up — this print is over 8 hours. Consider Quick Draft to test first.");
    if (stats.dimensions.width > 250 || stats.dimensions.depth > 250 || stats.dimensions.height > 250) {
      list.push("This model is quite large. Make sure your maker's printer can fit it.");
    }
    if (settings.infill < 10 && settings.material !== "PLA") {
      list.push("Low infill on PETG or ABS can make parts feel hollow.");
    }
    return list;
  }, [settings, stats]);

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "stl" && ext !== "obj" && ext !== "3mf") {
      toast.error("Please upload an STL, OBJ, or 3MF file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Please use a file under 50MB.");
      return;
    }

    setProcessing(true);
    try {
      const geometry =
        ext === "stl" ? await loadStl(file) : ext === "obj" ? await loadObj(file) : await load3mf(file);
      setModel({ name: file.name, extension: ext as "stl" | "obj" | "3mf", geometry });
      setRotation({ x: 0, y: 0, z: 0 });
      toast.success(`${file.name} loaded`);
    } catch (error: any) {
      toast.error(error?.message ?? "Could not load that model.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updateSetting = <K extends keyof SlicerSettings>(key: K, value: SlicerSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setActivePreset("custom");
  };

  const applyPreset = (preset: (typeof QUALITY_PRESETS)[number]) => {
    setSettings((current) => ({ ...current, ...preset.settings }));
    setActivePreset(preset.id);
    toast.success(`${preset.name} applied`);
  };

  const clearFile = () => {
    setModel(null);
    setRotation({ x: 0, y: 0, z: 0 });
  };

  const downloadGcode = () => {
    if (!model || !stats) {
      toast.error("Upload a model first.");
      return;
    }
    downloadText(`${safeBaseName(model.name)}.gcode`, generateBasicGcode(model.name, settings, stats), "text/plain");
    toast.success("GCODE downloaded");
  };

  const copySettings = async () => {
    await navigator.clipboard.writeText(settingsToText(settings, stats, model?.name ?? null));
    toast.success("Settings copied");
  };

  const shareSettings = async () => {
    const encoded = btoa(JSON.stringify(settings));
    const url = `${window.location.origin}${window.location.pathname}?settings=${encodeURIComponent(encoded)}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground">
        <SEO
          title="3D Print Quote — Upload STL, OBJ, or 3MF | PrintLoco"
          description="Upload your 3D model, pick a quality, and get an instant price. Beginner-friendly slicer with auto-matched local makers."
          path="/upload"
        />
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          {/* Hero */}
          <section className="mb-8 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Step 1 of 3 — Upload your design
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">
              Get an instant 3D print quote
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Drag in an STL, OBJ, or 3MF file. We'll show your model, estimate the price, and match you with a nearby maker. No experience needed.
            </p>
          </section>

          {/* How it works strip */}
          {!model && (
            <section className="mb-8 grid gap-3 sm:grid-cols-3">
              <HowStep number="1" title="Upload your file" body="STL, OBJ, or 3MF — under 50MB." />
              <HowStep number="2" title="Pick a quality" body="One click presets, no jargon." />
              <HowStep number="3" title="Order from a local maker" body="See real makers near you." />
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            {/* Left: preview & upload */}
            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FileBox className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      {model ? model.name : "Your 3D model"}
                    </h2>
                  </div>
                  {model && (
                    <div className="flex flex-wrap gap-2">
                      <RotateChip label="Tip ⟲" onClick={() => setRotation((r) => ({ ...r, x: r.x - 90 }))} />
                      <RotateChip label="Tip ⟳" onClick={() => setRotation((r) => ({ ...r, x: r.x + 90 }))} />
                      <RotateChip label="Spin" onClick={() => setRotation((r) => ({ ...r, z: r.z + 90 }))} />
                      <Button onClick={clearFile} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-secondary/30 to-accent-soft/30">
                  {previewGeometry ? (
                    <StlPreview
                      geometry={previewGeometry}
                      color="hsl(var(--primary))"
                      plate={{ x: 260, y: 260, z: 260 }}
                      className="h-full w-full"
                    />
                  ) : (
                    <UploadDropzone
                      processing={processing}
                      dragging={dragging}
                      onDragState={setDragging}
                      onFile={handleFile}
                      inputRef={inputRef}
                    />
                  )}
                  {processing && previewGeometry && (
                    <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
                      <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <div className="mt-3 font-medium text-foreground">Loading your model…</div>
                      </div>
                    </div>
                  )}
                </div>

                {model && (
                  <div className="border-t border-border bg-secondary/30 px-5 py-3 text-xs text-muted-foreground">
                    Drag to rotate · scroll to zoom · pinch on touch
                  </div>
                )}
              </section>

              {/* Quote summary */}
              {stats && (
                <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold text-foreground">Your instant estimate</h2>
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                      Updates live
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FriendlyStat icon={<Clock className="h-4 w-4" />} label="Print time" value={formatDuration(stats.printMinutes)} />
                    <FriendlyStat icon={<Weight className="h-4 w-4" />} label="Plastic used" value={`${stats.weightG.toFixed(1)} g`} />
                    <FriendlyStat icon={<Layers className="h-4 w-4" />} label="Layers" value={stats.layers.toLocaleString()} />
                    <FriendlyStat
                      icon={<Ruler className="h-4 w-4" />}
                      label="Size"
                      value={`${Math.round(stats.dimensions.width)}×${Math.round(stats.dimensions.depth)}×${Math.round(stats.dimensions.height)} mm`}
                    />
                  </div>

                  {tips.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-accent/30 bg-accent-soft/60 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                        <AlertTriangle className="h-4 w-4" /> Friendly tips
                      </div>
                      <ul className="space-y-1 text-sm text-foreground">
                        {tips.map((tip) => <li key={tip}>• {tip}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={downloadGcode} className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Download className="h-4 w-4" /> Download GCODE
                    </Button>
                    <Button onClick={copySettings} variant="outline" className="min-h-11">
                      <Copy className="h-4 w-4" /> Copy settings
                    </Button>
                    <Button onClick={shareSettings} variant="ghost" className="min-h-11">
                      <LinkIcon className="h-4 w-4" /> Share link
                    </Button>
                  </div>
                </section>
              )}
            </div>

            {/* Right: settings */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Material */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <SectionHeader
                  icon={<Wand2 className="h-4 w-4" />}
                  title="Pick a material"
                  hint="What plastic should your maker use?"
                />
                <Select
                  value={settings.material}
                  onValueChange={(value: SlicerSettings["material"]) => {
                    setSettings((current) => ({ ...current, material: value, nozzleTemp: MATERIAL_DEFAULTS[value] }));
                    setActivePreset("custom");
                  }}
                >
                  <SelectTrigger className="mt-3 min-h-12 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MATERIAL_INFO) as SlicerSettings["material"][]).map((key) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col items-start py-1">
                          <span className="font-semibold">{MATERIAL_INFO[key].label}</span>
                          <span className="text-xs text-muted-foreground">{MATERIAL_INFO[key].description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              {/* Quality presets */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <SectionHeader
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Choose a quality"
                  hint="Most people pick Standard. You can change it anytime."
                />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {QUALITY_PRESETS.map((preset) => {
                    const active = activePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`group flex min-h-20 flex-col items-start rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border bg-background hover:border-primary/50 hover:bg-secondary/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-bold text-foreground">
                            <span className="mr-1.5">{preset.emoji}</span>
                            {preset.name}
                          </span>
                          {active && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                              On
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Advanced (collapsible) */}
              <section className="rounded-3xl border border-border bg-card shadow-card">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-display text-base font-semibold text-foreground">Advanced settings</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-6 border-t border-border px-6 py-5">
                    <FriendlySlider
                      label="Layer thickness"
                      help="Thinner = smoother surface, but takes longer."
                      value={settings.layerHeight}
                      min={0.1}
                      max={0.4}
                      step={0.01}
                      suffix=" mm"
                      decimals={2}
                      leftHint="Smoother"
                      rightHint="Faster"
                      onChange={(v) => updateSetting("layerHeight", v)}
                    />
                    <FriendlySlider
                      label="Inside fill"
                      help="How solid the inside is. More fill = stronger and heavier."
                      value={settings.infill}
                      min={0}
                      max={100}
                      step={5}
                      suffix="%"
                      leftHint="Lighter"
                      rightHint="Stronger"
                      onChange={(v) => updateSetting("infill", v)}
                    />
                    <FriendlySlider
                      label="Print speed"
                      help="Slower prints usually look cleaner."
                      value={settings.speed}
                      min={20}
                      max={100}
                      step={5}
                      suffix=" mm/s"
                      leftHint="Cleaner"
                      rightHint="Faster"
                      onChange={(v) => updateSetting("speed", v)}
                    />
                    <FriendlySlider
                      label="Nozzle temperature"
                      help="Set automatically when you change material — only adjust if you know what you're doing."
                      value={settings.nozzleTemp}
                      min={190}
                      max={250}
                      step={1}
                      suffix=" °C"
                      onChange={(v) => updateSetting("nozzleTemp", v)}
                    />
                  </div>
                )}
              </section>

              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
                Need help? Check our{" "}
                <Link to="/" className="font-medium text-primary hover:underline">
                  guide
                </Link>{" "}
                or browse <Link to="/printers" className="font-medium text-primary hover:underline">printers</Link>.
              </div>
            </aside>
          </div>

          {/* Printer matches */}
          {stats && (
            <section className="mt-10">
              <div className="mb-5 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Step 3 — Pick a maker
                </div>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground">Local makers near you</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Auto-matched to your file, material, and quality. Cost shown is for the full print.
                </p>
              </div>
              <PrinterMatches
                material={settings.material}
                weightGrams={stats.weightG}
                is3mf={model?.extension === "3mf"}
              />
            </section>
          )}
        </main>

        <Footer />
      </div>
    </TooltipProvider>
  );
};

const HowStep = ({ number, title, body }: { number: string; title: string; body: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {number}
    </div>
    <div className="mt-3 font-display text-lg font-semibold text-foreground">{title}</div>
    <div className="mt-1 text-sm text-muted-foreground">{body}</div>
  </div>
);

const SectionHeader = ({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) => (
  <div>
    <div className="flex items-center gap-2 text-primary">
      {icon}
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
  </div>
);

const FriendlyStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-secondary/40 p-4">
    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-2 font-display text-xl font-bold text-foreground">{value}</div>
  </div>
);

const RotateChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button variant="outline" size="sm" onClick={onClick} className="bg-card">
    {label}
  </Button>
);

const UploadDropzone = ({
  processing,
  dragging,
  onDragState,
  onFile,
  inputRef,
}: {
  processing: boolean;
  dragging: boolean;
  onDragState: (value: boolean) => void;
  onFile: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div
    className={`absolute inset-0 m-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
      dragging
        ? "border-accent bg-accent-soft/60"
        : "border-primary/40 bg-card/50 hover:border-primary hover:bg-card"
    }`}
    onDragOver={(event) => {
      event.preventDefault();
      onDragState(true);
    }}
    onDragLeave={() => onDragState(false)}
    onDrop={(event) => {
      event.preventDefault();
      onDragState(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    }}
  >
    <input
      ref={inputRef}
      type="file"
      accept=".stl,.obj,.3mf,model/stl,text/plain,model/3mf"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
      }}
    />
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={processing}
      className="flex flex-col items-center px-6 py-8 disabled:opacity-60"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UploadIcon className="h-8 w-8" />
      </div>
      <div className="mt-4 font-display text-2xl font-bold text-foreground">
        {processing ? "Loading…" : "Drop your file here"}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        or <span className="font-semibold text-primary underline-offset-2 hover:underline">browse your computer</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {["STL", "OBJ", "3MF"].map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            .{tag.toLowerCase()}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">· up to 50MB</span>
      </div>
    </button>
  </div>
);

const FriendlySlider = ({
  label,
  help,
  value,
  min,
  max,
  step,
  suffix,
  decimals = 0,
  leftHint,
  rightHint,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  decimals?: number;
  leftHint?: string;
  rightHint?: string;
  onChange: (value: number) => void;
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold text-foreground">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">{help}</TooltipContent>
        </Tooltip>
      </div>
      <div className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold tabular-nums text-foreground">
        {value.toFixed(decimals)}{suffix}
      </div>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => onChange(Number(next.toFixed(decimals || 3)))}
    />
    {(leftHint || rightHint) && (
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </div>
    )}
  </div>
);

async function loadStl(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();
  return geometry;
}

async function loadObj(file: File): Promise<THREE.BufferGeometry> {
  const text = await file.text();
  const group = new OBJLoader().parse(text);
  group.updateMatrixWorld(true);
  const positions: number[] = [];
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const position = geometry.getAttribute("position");
    if (!position) return;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      positions.push(vertex.x, vertex.y, vertex.z);
    }
  });
  if (positions.length === 0) throw new Error("OBJ contains no mesh geometry.");
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

async function load3mf(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const result = await parse3mf(buffer);
  const geometry = result.geometry;
  if (!geometry.getAttribute("position") || geometry.getAttribute("position").count === 0) {
    throw new Error("3MF contains no mesh geometry.");
  }
  geometry.computeVertexNormals();
  return geometry;
}

function downloadText(fileName: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function loadSettings(): SlicerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SLICER_SETTINGS;
  } catch {
    return DEFAULT_SLICER_SETTINGS;
  }
}

function sanitizeSettings(value: Partial<SlicerSettings>): SlicerSettings {
  const material = value.material === "ABS" || value.material === "PETG" || value.material === "PLA" ? value.material : "PLA";
  return {
    material,
    layerHeight: clamp(Number(value.layerHeight ?? DEFAULT_SLICER_SETTINGS.layerHeight), 0.1, 0.4),
    infill: clamp(Math.round(Number(value.infill ?? DEFAULT_SLICER_SETTINGS.infill)), 0, 100),
    nozzleTemp: clamp(Math.round(Number(value.nozzleTemp ?? MATERIAL_DEFAULTS[material])), 190, 250),
    speed: clamp(Math.round(Number(value.speed ?? DEFAULT_SLICER_SETTINGS.speed)), 10, 100),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default Upload;
