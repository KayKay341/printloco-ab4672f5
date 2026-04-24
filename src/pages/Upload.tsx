import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload as UploadIcon,
  FileBox,
  MapPin,
  Sparkles,
  Loader2,
  CreditCard,
  Layers,
  Package,
  Palette,
  Link2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  MATERIAL_BASE_PRICE,
  sliceStlBufferAccurate,
  type SliceResult,
} from "@/lib/stlSlicer";
import { parse3mf, recolorBySlot, type FilamentSlot, type Mfg3mfResult } from "@/lib/threeMfParser";
import StlPreview from "@/components/StlPreview";
import ColorPicker, { COMMON_COLORS } from "@/components/ColorPicker";
import PrinterMap from "@/components/PrinterMap";
import CheckoutDialog from "@/components/CheckoutDialog";
import BulkQuoteDialog from "@/components/BulkQuoteDialog";
import CostEstimator, { DEFAULT_COST_INPUTS, type CostInputs, type EstimatorOutput } from "@/components/CostEstimator";
import { scorePrinter, type PrinterForScore, type ScoredPrinter } from "@/lib/printerScore";
import * as THREE from "three";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resin"];

type SourceMode = "file" | "url";

type FilamentColorRow = {
  material: string;
  color_name: string;
  hex_code: string;
  in_stock: boolean;
  surcharge_per_gram?: number;
};

type PrinterRow = PrinterForScore & {
  brand: string;
  model: string;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  owner_id: string;
  has_ams: boolean;
  ams_slot_count: number;
  accepts_3mf: boolean;
  accepts_bulk: boolean;
  min_bulk_quantity: number;
  material_prices: Record<string, number> | null;
  profiles: { full_name: string | null } | null;
  filament_colors: FilamentColorRow[];
};

type FileKind = "stl" | "3mf";

const Upload = () => {
  const { user, loading } = useAuth();
  const { isDemo, addDemoUpload, createDemoOrder } = useDemoMode();
  const navigate = useNavigate();
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<FileKind>("stl");
  const [parsing, setParsing] = useState(false);

  // STL path
  const [slice, setSlice] = useState<SliceResult | null>(null);

  // 3MF path
  const [mfg, setMfg] = useState<Mfg3mfResult | null>(null);
  const [originalSlots, setOriginalSlots] = useState<FilamentSlot[]>([]);

  const [material, setMaterial] = useState("PLA");
  const [colorName, setColorName] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState<string>("#9333EA");
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);
  const [savedStlId, setSavedStlId] = useState<string | null>(null);

  // Cost estimator inputs (live)
  const [costInputs, setCostInputs] = useState<CostInputs>({ ...DEFAULT_COST_INPUTS, material: "PLA" });
  const [estimate, setEstimate] = useState<EstimatorOutput | null>(null);

  // Bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrinter, setBulkPrinter] = useState<PrinterRow | null>(null);

  // Sync estimator material with the chosen STL material
  useEffect(() => {
    setCostInputs((c) => ({ ...c, material }));
  }, [material]);

  // Fetch a remote model via the fetch-model edge function and load it as a File
  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Paste a URL to a .stl or .3mf file");
      return;
    }
    setUrlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-model", { body: { url: trimmed } });
      if (error || !data?.base64) throw new Error(error?.message ?? data?.error ?? "Could not fetch model");
      const bin = atob(data.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.contentType });
      const f = new File([blob], data.fileName, { type: data.contentType });
      setSourceUrl(data.sourceUrl ?? trimmed);
      setSavedStlId(null);
      setFile(f);
      toast.success("Model loaded from URL");
    } catch (err: any) {
      toast.error(err.message ?? "Could not fetch URL");
    } finally {
      setUrlLoading(false);
    }
  };


  useEffect(() => {
    supabase
      .from("printers")
      .select("id, owner_id, brand, model, materials, price_per_gram, material_prices, neighborhood, city, bio, latitude, longitude, has_ams, ams_slot_count, accepts_3mf, accepts_bulk, min_bulk_quantity, profiles!printers_owner_profile_fkey(full_name), filament_colors(material, color_name, hex_code, in_stock, surcharge_per_gram)")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setPrinters((data as unknown as PrinterRow[]) ?? []);
      });
  }, []);

  // Parse on file change
  useEffect(() => {
    if (!file) {
      setSlice(null);
      setMfg(null);
      return;
    }
    setParsing(true);
    const ext = file.name.toLowerCase().split(".").pop();
    const kind: FileKind = ext === "3mf" ? "3mf" : "stl";
    setFileKind(kind);

    file.arrayBuffer()
      .then(async (buf) => {
        if (kind === "3mf") {
          const result = await parse3mf(buf);
          setMfg(result);
          setOriginalSlots(result.filaments.map((f) => ({ ...f })));
          setSlice(null);
        } else {
          const result = await sliceStlBufferAccurate(buf, { material, infillPct: 20, layerHeightMm: 0.2 });
          setSlice(result);
          setMfg(null);
        }
      })
      .catch((err) => {
        toast.error(`Could not parse ${kind.toUpperCase()}: ` + err.message);
        setSlice(null);
        setMfg(null);
      })
      .finally(() => setParsing(false));
  }, [file]);

  // Re-slice STL when material changes (no infill anymore — fixed at 20%).
  useEffect(() => {
    if (fileKind !== "stl" || !file) return;
    file.arrayBuffer().then((buf) => {
      sliceStlBufferAccurate(buf, { material, infillPct: 20, layerHeightMm: 0.2 })
        .then(setSlice)
        .catch(() => {
          /* ignore */
        });
    });
  }, [material, fileKind]);

  /** Raw base weight from slicer (1×, mm interpretation). */
  const baseWeightG = useMemo(() => {
    if (mfg) return mfg.totalWeightG;
    if (slice) return slice.weightG;
    return 0;
  }, [mfg, slice]);

  const baseBboxMm = useMemo(() => {
    if (mfg) return mfg.bbox;
    if (slice) return slice.bbox;
    return { x: 0, y: 0, z: 0 };
  }, [mfg, slice]);

  const basePrintMinutes = useMemo(() => {
    if (mfg) return mfg.printMinutes;
    return slice?.printMinutes ?? 0;
  }, [mfg, slice]);

  // Auto-detect inch-scale STLs (very small "mm" bbox) and switch units once.
  useEffect(() => {
    if (!slice) return;
    const max = Math.max(slice.bbox.x, slice.bbox.y, slice.bbox.z);
    if (max > 0 && max < 8 && costInputs.units === "mm") {
      setCostInputs((c) => ({ ...c, units: "in" }));
      toast.info("Detected tiny model — interpreting as inches. Toggle units to override.");
    }
  }, [slice]);

  /** Live total weight after estimator inputs (falls back to raw slice weight). */
  const totalWeightG = estimate?.weightG ?? baseWeightG;
  const baseQuote = estimate ? estimate.amountCents / 100 : baseWeightG * (MATERIAL_BASE_PRICE[material] ?? 0.2);

  const previewGeometry: THREE.BufferGeometry | null = mfg?.geometry ?? slice?.geometry ?? null;

  // Build printer matches
  const matches: (PrinterRow & ScoredPrinter)[] = useMemo(() => {
    if (totalWeightG <= 0) return [];
    return printers
      .map((p) => {
        const score = scorePrinter(p, { weightG: totalWeightG, material, colorName });
        return { ...p, ...score };
      })
      // For 3MF jobs, only show printers that can do multi-color
      .filter((p) => {
        if (fileKind !== "3mf" || !mfg) return true;
        const slotsNeeded = mfg.filaments.length;
        return p.has_ams && p.accepts_3mf && p.ams_slot_count >= slotsNeeded;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [printers, totalWeightG, material, colorName, fileKind, mfg]);

  const mapPins = useMemo(
    () =>
      matches
        .filter((m) => m.latitude != null && m.longitude != null)
        .map((m) => ({
          id: m.id,
          lng: m.longitude!,
          lat: m.latitude!,
          label: `${m.brand} ${m.model} · $${m.totalPrice.toFixed(2)}`,
          color: m.matchedHex ?? colorHex,
        })),
    [matches, colorHex]
  );

  if (loading) return <div className="container py-24">Loading…</div>;
  // Demo visitors can browse without auth — only redirect signed-out non-demo users at submit time.

  // Reassign one slot's color (multi-color preview customization)
  const reassignSlot = (slotIdx: number, hex: string, name?: string) => {
    if (!mfg) return;
    const before = mfg.filaments.map((f) => ({ ...f }));
    const after = mfg.filaments.map((f, i) => (i === slotIdx ? { ...f, hex } : f));
    recolorBySlot(mfg.geometry, before, after);
    setMfg({ ...mfg, filaments: after });
  };

  const ensureFileSaved = async (): Promise<string | null> => {
    if (!file || !user) return null;
    if (savedStlId) return savedStlId;

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const contentType = fileKind === "3mf" ? "model/3mf" : "model/stl";
    const { error: upErr } = await supabase.storage
      .from("stl-files")
      .upload(path, file, { contentType, upsert: false });
    if (upErr) throw upErr;

    const { data, error: insErr } = await supabase
      .from("stl_files")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        material,
        estimated_weight: Math.round(totalWeightG * 10) / 10,
        estimated_price: Number(baseQuote.toFixed(2)),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    setSavedStlId(data.id);
    return data.id;
  };

  const handleSaveQuote = async () => {
    if (!file || totalWeightG <= 0) {
      toast.error("Upload a model first.");
      return;
    }
    setSubmitting(true);
    try {
      await ensureFileSaved();
      toast.success("Quote saved!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = async (m: PrinterRow & ScoredPrinter) => {
    if (!file || totalWeightG <= 0 || !user) {
      toast.error("Upload a model first.");
      return;
    }
    try {
      const stlId = await ensureFileSaved();
      const amountCents = Math.max(100, Math.round(m.totalPrice * 100));
      const noteParts: string[] = [`${totalWeightG.toFixed(1)}g`];
      if (mfg) {
        noteParts.push(`${mfg.filaments.length} colors`);
        mfg.filaments.forEach((f, i) => {
          noteParts.push(`Slot ${i + 1}: ${f.type} ${f.hex}`);
        });
      }
      setCheckoutPayload({
        printerId: m.id,
        stlFileId: stlId,
        makerId: m.owner_id,
        material,
        quantity: 1,
        amountCents,
        colorName: colorName ?? undefined,
        notes: noteParts.join(" · "),
        customerId: user.id,
        customerEmail: user.email ?? undefined,
      });
      setCheckoutOpen(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not start checkout");
    }
  };

  const openBulk = (m: PrinterRow) => {
    setBulkPrinter(m);
    setBulkOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Upload STL or 3MF — Get an Instant 3D Print Quote | PrintLoco"
        description="Upload your STL or .3mf file and get a real-time slice, weight estimate, and quote. Match with a verified local maker and book in seconds."
        path="/upload"
      />
      <Navbar />
      <main className="container max-w-6xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get a quote</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Upload, slice, match — <span className="italic text-primary">in seconds</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          STL for single-color prints, or upload a Bambu <strong>.3mf</strong> to preview every painted color in 3D.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT: upload + controls */}
          <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <label
              htmlFor="stl"
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                {file ? <FileBox className="h-7 w-7" /> : <UploadIcon className="h-7 w-7" />}
              </div>
              <div className="font-display text-lg font-semibold">
                {file ? file.name : "Click to upload an STL or .3mf"}
              </div>
              <div className="text-xs text-muted-foreground">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${fileKind.toUpperCase()}`
                  : "Max 50MB · .stl or Bambu .3mf"}
              </div>
              <input
                id="stl"
                type="file"
                accept=".stl,.3mf,model/stl,model/3mf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) {
                    const ext = f.name.toLowerCase().split(".").pop();
                    if (ext !== "stl" && ext !== "3mf") {
                      toast.error("Please upload a .stl or .3mf file");
                      return;
                    }
                    if (f.size > 50 * 1024 * 1024) {
                      toast.error("File is too large (50MB max)");
                      return;
                    }
                  }
                  setSavedStlId(null);
                  setFile(f);
                }}
              />
            </label>

            {/* 3D preview */}
            {file && (
              <div className="rounded-2xl border border-border bg-gradient-hero p-2">
                <div className="relative h-72 w-full overflow-hidden rounded-xl">
                  {parsing && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <StlPreview
                    geometry={previewGeometry}
                    color={colorHex}
                    vertexColors={fileKind === "3mf"}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}

            {/* 3MF: multi-color slot list */}
            {mfg && (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Multi-color print · {mfg.filaments.length} slots
                </div>
                <div className="mt-3 space-y-2">
                  {mfg.filaments.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-card p-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg border border-border"
                          style={{ backgroundColor: f.hex }}
                        />
                        <div>
                          <div className="text-sm font-semibold">Slot {i + 1} · {f.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {mfg.weightPerSlot[i]?.toFixed(1) ?? "0.0"}g
                          </div>
                        </div>
                      </div>
                      <input
                        type="color"
                        value={f.hex}
                        onChange={(e) => reassignSlot(i, e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                        aria-label={`Slot ${i + 1} color`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Tap a swatch to recolor any slot. We'll show only AMS-equipped makers with enough slots.
                </div>
              </div>
            )}

            {/* STL: material + single color */}
            {!mfg && (
              <>
                <div>
                  <Label>Material</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MATERIALS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMaterial(m)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                          material === m
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-foreground/30"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <Label>Color</Label>
                  </div>
                  <div className="mt-2">
                    <ColorPicker
                      value={colorName}
                      onChange={(name, hex) => {
                        setColorName(name);
                        setColorHex(hex);
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {colorName ? `Matching makers who stock ${colorName} ${material}` : "Optional — pick to filter by stocked color"}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* RIGHT: live quote + matches */}
          <section className="space-y-6">
            {baseWeightG > 0 ? (
              <>
                <CostEstimator
                  base={{
                    baseWeightG,
                    basePrintMinutes,
                    bboxMm: baseBboxMm,
                    triangles: mfg?.triangles ?? slice?.triangles,
                  }}
                  inputs={costInputs}
                  onChange={setCostInputs}
                  onResolved={setEstimate}
                  hideMaterial={!!mfg}
                />
                <div className="flex gap-2">
                  <Button variant="hero" onClick={handleSaveQuote} disabled={submitting}>
                    {submitting ? "Saving…" : "Save quote"}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/printers")}>
                    Browse all printers
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <div className="mt-3 font-display text-lg font-semibold">Drop a model to see the quote</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  We slice locally — nothing leaves your browser until you save.
                </div>
              </div>
            )}

            {totalWeightG > 0 && matches.length > 0 && (
              <>
                <div className="rounded-3xl border border-border bg-card p-2 shadow-soft">
                  <PrinterMap pins={mapPins} className="h-64 w-full overflow-hidden rounded-2xl" />
                </div>

                <div>
                  <h2 className="font-display text-xl font-semibold">Top matches</h2>
                  {fileKind === "3mf" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Filtered to AMS-equipped makers with at least {mfg?.filaments.length} slots.
                    </p>
                  )}
                  <div className="mt-3 space-y-3">
                    {matches.map((m) => (
                      <article key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {m.neighborhood || m.city || "Local"}
                              {m.distanceKm != null && <span>· {m.distanceKm.toFixed(1)} km</span>}
                            </div>
                            <div className="mt-1 truncate font-display text-lg font-semibold">{m.brand} {m.model}</div>
                            <div className="text-xs text-muted-foreground">by {m.profiles?.full_name || "Anonymous Maker"}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              {m.has_ams && (
                                <Badge tone="ok">
                                  <Layers className="h-3 w-3" />
                                  AMS · {m.ams_slot_count}
                                </Badge>
                              )}
                              <Badge tone={m.hasMaterial ? "ok" : "off"}>{m.hasMaterial ? "✓" : "✗"} {material}</Badge>
                              {colorName && !mfg && (
                                <Badge tone={m.hasColor ? "ok" : "off"}>
                                  <span
                                    className="inline-block h-2 w-2 rounded-full border border-border"
                                    style={{ backgroundColor: m.matchedHex ?? "transparent" }}
                                  />
                                  {m.hasColor ? colorName : `no ${colorName}`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-xl font-semibold">${m.totalPrice.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">${Number(m.price_per_gram).toFixed(2)}/g</div>
                            <div className="mt-2 inline-flex h-6 items-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                              {m.score}% match
                            </div>
                            <div className="mt-3 flex flex-col gap-1.5">
                              <Button size="sm" variant="hero" onClick={() => handleBook(m)}>
                                <CreditCard className="h-3.5 w-3.5" /> Book
                              </Button>
                              {m.accepts_bulk && (
                                <Button size="sm" variant="ghost" onClick={() => openBulk(m)}>
                                  <Package className="h-3.5 w-3.5" /> Bulk
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} payload={checkoutPayload} />
        <BulkQuoteDialog open={bulkOpen} onOpenChange={setBulkOpen} printer={bulkPrinter} />
      </main>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-0.5 font-display text-base font-semibold">{value}</div>
  </div>
);

const Badge = ({ children, tone }: { children: React.ReactNode; tone: "ok" | "off" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
    tone === "ok" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
  }`}>
    {children}
  </span>
);

function fmtMins(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default Upload;
