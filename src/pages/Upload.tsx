import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import {
  AlertTriangle,
  Copy,
  Download,
  FileBox,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Upload as UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import PrinterMatches from "@/components/PrinterMatches";
import SEO from "@/components/SEO";
import Logo from "@/components/site/Logo";
import StlPreview from "@/components/StlPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parse3mf } from "@/lib/threeMfParser";
import {
  DEFAULT_SLICER_SETTINGS,
  MATERIAL_DEFAULTS,
  PRESETS,
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

type SavedProfile = {
  id: string;
  name: string;
  settings: SlicerSettings;
};

const SETTINGS_KEY = "printloco-slicer-settings";
const HISTORY_KEY = "printloco-slicer-history";
const PROFILES_KEY = "printloco-slicer-profiles";

const Upload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<ModelFile | null>(null);
  const [settings, setSettings] = useState<SlicerSettings>(() => loadSettings());
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => loadProfiles());
  const [profileName, setProfileName] = useState("");
  const [history, setHistory] = useState<SlicerSettings[]>(() => loadHistory());

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setHistory((prev) => {
      const next = [settings, ...prev.filter((s) => JSON.stringify(s) !== JSON.stringify(settings))].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("settings");
    if (!shared) return;
    try {
      const decoded = JSON.parse(atob(shared)) as SlicerSettings;
      setSettings(sanitizeSettings(decoded));
      toast.success("Shared slicer settings loaded");
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

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (!stats) return list;
    if (stats.printMinutes > 480) list.push("This print is estimated over 8 hours.");
    if (settings.infill < 8) list.push("Very low infill can make parts fragile.");
    if (settings.speed > 85 && settings.layerHeight < 0.18) list.push("High speed with thin layers may reduce detail.");
    if (stats.dimensions.width > 250 || stats.dimensions.depth > 250 || stats.dimensions.height > 250) {
      list.push("Large model: confirm it fits your printer build volume.");
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
    toast.info(`Received ${file.name} — loading preview…`);
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
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setSettings((current) => ({ ...current, ...preset.settings }));
    toast.success(`${preset.name} profile applied`);
  };

  const saveProfile = () => {
    const name = profileName.trim();
    if (!name) {
      toast.error("Name the profile first.");
      return;
    }
    setProfiles((prev) => [{ id: crypto.randomUUID(), name, settings }, ...prev].slice(0, 12));
    setProfileName("");
    toast.success("Profile saved");
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

  const downloadJson = () => {
    downloadText("printloco-settings.json", JSON.stringify({ file: model?.name ?? null, settings, stats }, null, 2), "application/json");
  };

  const downloadTxt = () => {
    downloadText("printloco-settings.txt", settingsToText(settings, stats, model?.name ?? null), "text/plain");
  };

  return (
    <div className="min-h-screen bg-slicer-background text-slicer-foreground">
      <SEO
        title="PrintLoco 3D Slicer — STL & OBJ GCODE Tool"
        description="Upload STL or OBJ files, preview models, tune slicer settings, estimate layers, time, weight, and download GCODE."
        path="/upload"
      />
      <header className="border-b border-slicer-border bg-slicer-panel/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo className="text-slicer-foreground [&_span_span:last-child]:text-slicer-green" />
            <div className="hidden h-8 w-px bg-slicer-border sm:block" />
            <div>
              <h1 className="font-sans text-xl font-bold tracking-normal text-slicer-foreground sm:text-2xl">
                PrintLoco 3D Slicer
              </h1>
              <p className="text-xs text-slicer-muted">Fast STL/OBJ preview, live estimates, and GCODE export</p>
            </div>
          </div>
          <Button
            variant="soft"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 border-slicer-cyan/40 bg-slicer-panel-strong text-slicer-cyan hover:border-slicer-cyan"
          >
            <UploadIcon className="h-4 w-4" /> Upload
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(360px,40%)_minmax(0,60%)]">
        <aside className="space-y-4 lg:order-1">
          <UploadPanel
            model={model}
            processing={processing}
            dragging={dragging}
            onDragState={setDragging}
            onFile={handleFile}
            onClear={clearFile}
            inputRef={inputRef}
          />

          <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">Slicer Settings</h2>
                <p className="text-xs text-slicer-muted">Adjust values and watch estimates update instantly.</p>
              </div>
              <Select
                value={settings.material}
                onValueChange={(value: SlicerSettings["material"]) => {
                  setSettings((current) => ({ ...current, material: value, nozzleTemp: MATERIAL_DEFAULTS[value] }));
                }}
              >
                <SelectTrigger className="min-h-11 w-28 border-slicer-border bg-slicer-panel-strong text-slicer-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLA">PLA</SelectItem>
                  <SelectItem value="ABS">ABS</SelectItem>
                  <SelectItem value="PETG">PETG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-5">
              <SettingSlider
                label="Layer Height"
                help="Thinner layers make more detail but take longer."
                value={settings.layerHeight}
                min={0.1}
                max={0.4}
                step={0.01}
                suffix="mm"
                decimals={2}
                onChange={(value) => updateSetting("layerHeight", value)}
              />
              <SettingSlider
                label="Infill"
                help="How solid the inside is — more is stronger but heavier."
                value={settings.infill}
                min={0}
                max={100}
                step={1}
                suffix="%"
                onChange={(value) => updateSetting("infill", value)}
              />
              <SettingSlider
                label="Nozzle Temperature"
                help="Hotend temperature for the selected plastic."
                value={settings.nozzleTemp}
                min={190}
                max={250}
                step={1}
                suffix="°C"
                onChange={(value) => updateSetting("nozzleTemp", value)}
              />
              <SettingSlider
                label="Print Speed"
                help="Faster prints finish sooner but can be less precise."
                value={settings.speed}
                min={10}
                max={100}
                step={1}
                suffix=" mm/s"
                onChange={(value) => updateSetting("speed", value)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4">
            <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">Preset Profiles</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="min-h-11 rounded-md border border-slicer-border bg-slicer-panel-strong p-3 text-left transition hover:border-slicer-green hover:bg-slicer-green/10"
                >
                  <div className="text-sm font-bold text-slicer-foreground">{preset.name}</div>
                  <div className="text-xs text-slicer-muted">{preset.description}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Custom profile name"
                className="min-h-11 border-slicer-border bg-slicer-panel-strong text-slicer-foreground placeholder:text-slicer-muted"
              />
              <Button onClick={saveProfile} className="min-h-11 bg-slicer-green text-slicer-background hover:bg-slicer-green/90">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
            {profiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSettings(profile.settings)}
                    className="flex min-h-11 w-full items-center justify-between rounded-md border border-slicer-border px-3 text-sm text-slicer-foreground hover:border-slicer-cyan"
                  >
                    <span>{profile.name}</span>
                    <span className="text-xs text-slicer-muted">{profile.settings.layerHeight}mm · {profile.settings.infill}%</span>
                  </button>
                ))}
              </div>
            )}
            {history.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => setSettings(history[1])}
                className="mt-3 min-h-11 text-slicer-cyan hover:bg-slicer-cyan/10"
              >
                Load Previous Settings
              </Button>
            )}
          </section>
        </aside>

        <section className="space-y-4 lg:order-2">
          <div className="rounded-lg border border-slicer-border bg-slicer-panel p-3 shadow-2xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">3D Model Preview</h2>
                <p className="text-xs text-slicer-muted">Drag to rotate · mouse wheel to zoom · touch gestures supported</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RotateButton axis="x" direction={-90} onClick={() => setRotation((r) => ({ ...r, x: r.x - 90 }))} />
                <RotateButton axis="x" direction={90} onClick={() => setRotation((r) => ({ ...r, x: r.x + 90 }))} />
                <RotateButton axis="y" direction={90} onClick={() => setRotation((r) => ({ ...r, y: r.y + 90 }))} />
                <RotateButton axis="z" direction={90} onClick={() => setRotation((r) => ({ ...r, z: r.z + 90 }))} />
              </div>
            </div>
            <div className="relative h-[420px] overflow-hidden rounded-md border border-slicer-border bg-slicer-background sm:h-[520px] lg:h-[610px]">
              {previewGeometry ? (
                <StlPreview geometry={previewGeometry} color="hsl(var(--slicer-cyan))" plate={{ x: 260, y: 260, z: 260 }} className="h-full w-full" />
              ) : (
                <div className="grid h-full place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg border border-slicer-cyan/40 bg-slicer-cyan/10 text-slicer-cyan">
                      <FileBox className="h-10 w-10" />
                    </div>
                    <div className="mt-5 text-2xl font-bold text-slicer-foreground">No model loaded</div>
                    <p className="mt-2 max-w-md text-sm text-slicer-muted">Upload an STL or OBJ file to inspect dimensions, tune slicer settings, and download GCODE.</p>
                  </div>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 grid place-items-center bg-slicer-background/80 backdrop-blur-sm">
                  <div className="rounded-lg border border-slicer-cyan/40 bg-slicer-panel p-5 text-center shadow-2xl">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slicer-cyan border-t-transparent" />
                    <div className="mt-3 font-bold text-slicer-cyan">Loading model…</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <StatsBox stats={stats} />
            <LayerPreview layers={stats?.layers ?? 0} layerHeight={settings.layerHeight} />
          </div>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-slicer-warning/40 bg-slicer-warning/10 p-4 text-sm text-slicer-foreground">
              <div className="mb-2 flex items-center gap-2 font-bold text-slicer-warning">
                <AlertTriangle className="h-4 w-4" /> Safety Warnings
              </div>
              <ul className="space-y-1">
                {warnings.map((warning) => <li key={warning}>• {warning}</li>)}
              </ul>
            </div>
          )}

          <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">Download & Share</h2>
                <p className="text-xs text-slicer-muted">Export printer instructions or back up the current settings.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadGcode} disabled={!stats} className="min-h-11 bg-slicer-cyan text-slicer-background hover:bg-slicer-cyan/90">
                  <Download className="h-4 w-4" /> Download GCODE
                </Button>
                <Button onClick={copySettings} variant="soft" className="min-h-11 border-slicer-border bg-slicer-panel-strong text-slicer-foreground">
                  <Copy className="h-4 w-4" /> Copy Settings
                </Button>
                <Button onClick={shareSettings} variant="soft" className="min-h-11 border-slicer-border bg-slicer-panel-strong text-slicer-green">
                  <LinkIcon className="h-4 w-4" /> Share Settings
                </Button>
                <Button onClick={downloadJson} variant="ghost" className="min-h-11 text-slicer-muted hover:bg-slicer-panel-strong">JSON</Button>
                <Button onClick={downloadTxt} variant="ghost" className="min-h-11 text-slicer-muted hover:bg-slicer-panel-strong">TXT</Button>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

const UploadPanel = ({
  model,
  processing,
  dragging,
  onDragState,
  onFile,
  onClear,
  inputRef,
}: {
  model: ModelFile | null;
  processing: boolean;
  dragging: boolean;
  onDragState: (value: boolean) => void;
  onFile: (file: File) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <section
    className={`rounded-lg border border-dashed p-5 transition ${dragging ? "border-slicer-green bg-slicer-green/10" : "border-slicer-cyan/50 bg-slicer-panel"}`}
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
      className="flex min-h-32 w-full flex-col items-center justify-center rounded-md border border-slicer-border bg-slicer-panel-strong p-5 text-center transition hover:border-slicer-cyan hover:bg-slicer-cyan/10 disabled:opacity-60"
    >
      <UploadIcon className="h-9 w-9 text-slicer-cyan" />
      <span className="mt-3 text-lg font-bold text-slicer-foreground">Drag 3D file here or click to upload</span>
      <span className="mt-1 text-sm text-slicer-muted">Accepts STL, OBJ, and 3MF files</span>
    </button>
    {model && (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-slicer-border bg-slicer-panel-strong p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slicer-foreground">{model.name}</div>
          <div className="text-xs uppercase text-slicer-muted">.{model.extension} loaded</div>
        </div>
        <Button onClick={onClear} variant="ghost" className="min-h-11 text-slicer-danger hover:bg-slicer-danger/10">
          <Trash2 className="h-4 w-4" /> Clear File
        </Button>
      </div>
    )}
  </section>
);

const SettingSlider = ({
  label,
  help,
  value,
  min,
  max,
  step,
  suffix,
  decimals = 0,
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
  onChange: (value: number) => void;
}) => (
  <div title={help}>
    <div className="mb-2 flex items-start justify-between gap-3">
      <div>
        <Label className="text-sm font-bold text-slicer-foreground">{label}</Label>
        <div className="text-xs text-slicer-muted">{help}</div>
      </div>
      <div className="rounded-md border border-slicer-border bg-slicer-panel-strong px-2 py-1 text-sm font-bold tabular-nums text-slicer-green">
        {value.toFixed(decimals)}{suffix}
      </div>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => onChange(Number(next.toFixed(decimals || 3)))}
      className="py-2"
    />
  </div>
);

const RotateButton = ({ axis, direction, onClick }: { axis: "x" | "y" | "z"; direction: number; onClick: () => void }) => (
  <Button
    type="button"
    variant="soft"
    onClick={onClick}
    className="min-h-11 border-slicer-border bg-slicer-panel-strong text-slicer-foreground hover:border-slicer-cyan"
    title={`Rotate ${axis.toUpperCase()} ${direction} degrees`}
  >
    {direction < 0 ? <RotateCcw className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
    {axis.toUpperCase()} {Math.abs(direction)}°
  </Button>
);

const StatsBox = ({ stats }: { stats: SlicerStats | null }) => (
  <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4">
    <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">Stats & Estimates</h2>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
      <Stat label="Layers" value={stats ? stats.layers.toLocaleString() : "—"} />
      <Stat label="Print Time" value={stats ? formatDuration(stats.printMinutes) : "—"} />
      <Stat label="Material" value={stats ? `${stats.weightG.toFixed(1)}g` : "—"} />
      <Stat label="Plastic Cost" value={stats ? `$${stats.materialCost.toFixed(2)}` : "—"} />
    </div>
    <div className="mt-3 rounded-md border border-slicer-border bg-slicer-panel-strong p-3">
      <div className="text-xs uppercase tracking-wide text-slicer-muted">Model Dimensions</div>
      <div className="mt-1 text-lg font-bold text-slicer-cyan">
        {stats ? `${stats.dimensions.width} × ${stats.dimensions.height} × ${stats.dimensions.depth} mm` : "—"}
      </div>
      <div className="text-xs text-slicer-muted">Width × Height × Depth</div>
    </div>
  </section>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-slicer-border bg-slicer-panel-strong p-3">
    <div className="text-xs uppercase tracking-wide text-slicer-muted">{label}</div>
    <div className="mt-1 text-xl font-bold tabular-nums text-slicer-green">{value}</div>
  </div>
);

const LayerPreview = ({ layers, layerHeight }: { layers: number; layerHeight: number }) => {
  const visible = Math.max(1, Math.min(36, layers));
  return (
    <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">Layer Preview</h2>
          <p className="text-xs text-slicer-muted">Visual stack updates with layer height.</p>
        </div>
        <div className="text-sm font-bold text-slicer-cyan">{layerHeight.toFixed(2)}mm</div>
      </div>
      <div className="mt-4 flex h-48 flex-col-reverse justify-center gap-0.5 rounded-md border border-slicer-border bg-slicer-background p-4">
        {Array.from({ length: visible }).map((_, index) => (
          <div
            key={index}
            className="mx-auto h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${45 + (index / visible) * 48}%`,
              backgroundColor: `hsl(${(index * 360) / visible} 100% 55%)`,
              opacity: 0.55 + index / visible * 0.45,
            }}
          />
        ))}
      </div>
      <div className="mt-2 text-xs text-slicer-muted">Showing {visible} visual layers from {layers || 0} calculated layers.</div>
    </section>
  );
};

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

function loadHistory(): SlicerSettings[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(sanitizeSettings).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function loadProfiles(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
