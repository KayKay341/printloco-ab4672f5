import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload as UploadIcon, FileBox, MapPin, Sparkles, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  MATERIAL_BASE_PRICE,
  sliceStlBuffer,
  type SliceResult,
} from "@/lib/stlSlicer";
import StlPreview from "@/components/StlPreview";
import ColorPicker from "@/components/ColorPicker";
import PrinterMap from "@/components/PrinterMap";
import CheckoutDialog from "@/components/CheckoutDialog";
import { scorePrinter, type PrinterForScore, type ScoredPrinter } from "@/lib/printerScore";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resin"];

type PrinterRow = PrinterForScore & {
  brand: string;
  model: string;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  owner_id: string;
  profiles: { full_name: string | null } | null;
};

const Upload = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [slicing, setSlicing] = useState(false);
  const [slice, setSlice] = useState<SliceResult | null>(null);
  const [material, setMaterial] = useState("PLA");
  const [infill, setInfill] = useState(20);
  const [colorName, setColorName] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState<string>("#9333EA");
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);
  const [savedStlId, setSavedStlId] = useState<string | null>(null);


  // Fetch printers + their filament colors once
  useEffect(() => {
    supabase
      .from("printers")
      .select("id, brand, model, materials, price_per_gram, neighborhood, city, bio, latitude, longitude, profiles(full_name), filament_colors(material, color_name, hex_code, in_stock)")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setPrinters((data as unknown as PrinterRow[]) ?? []);
      });
  }, []);

  // Run the slicer when file or material/infill changes
  useEffect(() => {
    if (!file) {
      setSlice(null);
      return;
    }
    setSlicing(true);
    file.arrayBuffer()
      .then((buf) => {
        const result = sliceStlBuffer(buf, { material, infillPct: infill });
        setSlice(result);
      })
      .catch((err) => {
        toast.error("Could not parse STL: " + err.message);
        setSlice(null);
      })
      .finally(() => setSlicing(false));
  }, [file, material, infill]);

  const baseQuote = useMemo(() => {
    if (!slice) return 0;
    return slice.weightG * (MATERIAL_BASE_PRICE[material] ?? 0.2);
  }, [slice, material]);

  const matches: (PrinterRow & ScoredPrinter)[] = useMemo(() => {
    if (!slice) return [];
    return printers
      .map((p) => ({ ...p, ...scorePrinter(p, { weightG: slice.weightG, material, colorName }) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [printers, slice, material, colorName]);

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
  if (!user) return <Navigate to={`/auth?mode=signin`} replace />;

  const handleSaveQuote = async () => {
    if (!file || !slice) {
      toast.error("Upload an STL first.");
      return;
    }
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("stl-files")
        .upload(path, file, { contentType: "model/stl", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("stl_files").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        material,
        estimated_weight: Math.round(slice.weightG * 10) / 10,
        estimated_price: Number(baseQuote.toFixed(2)),
      });
      if (insErr) throw insErr;

      toast.success("Quote saved!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-6xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get a quote</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Upload, slice, match — <span className="italic text-primary">in seconds</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Real geometry-based slicing in your browser. Pick a material and color, see live cost, and find verified makers nearby.
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
                {file ? file.name : "Click to choose an STL"}
              </div>
              <div className="text-xs text-muted-foreground">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 50MB · .stl only"}
              </div>
              <input
                id="stl"
                type="file"
                accept=".stl,model/stl"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && !f.name.toLowerCase().endsWith(".stl")) {
                    toast.error("Please upload a .stl file");
                    return;
                  }
                  if (f && f.size > 50 * 1024 * 1024) {
                    toast.error("File is too large (50MB max)");
                    return;
                  }
                  setFile(f);
                }}
              />
            </label>

            {/* 3D preview */}
            {file && (
              <div className="rounded-2xl border border-border bg-gradient-hero p-2">
                <div className="relative h-72 w-full overflow-hidden rounded-xl">
                  {slicing && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <StlPreview geometry={slice?.geometry ?? null} color={colorHex} className="h-full w-full" />
                </div>
              </div>
            )}

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
              <div className="flex items-center justify-between">
                <Label>Infill</Label>
                <span className="text-sm font-semibold text-primary">{infill}%</span>
              </div>
              <Slider
                value={[infill]}
                onValueChange={(v) => setInfill(v[0])}
                min={5}
                max={100}
                step={5}
                className="mt-3"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Lower = lighter & cheaper. 20% works for most decorative parts.
              </div>
            </div>

            <div>
              <Label>Color</Label>
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
          </section>

          {/* RIGHT: live quote + matches */}
          <section className="space-y-6">
            {slice ? (
              <div className="rounded-3xl bg-gradient-hero p-6 shadow-card">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live estimate</div>
                <div className="mt-1 font-display text-5xl font-semibold">
                  ${baseQuote.toFixed(2)}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Weight" value={`${slice.weightG.toFixed(1)} g`} />
                  <Stat label="Print time" value={fmtMins(slice.printMinutes)} />
                  <Stat label="Volume" value={`${slice.volumeCm3.toFixed(1)} cm³`} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Bounding box: {slice.bbox.x.toFixed(0)} × {slice.bbox.y.toFixed(0)} × {slice.bbox.z.toFixed(0)} mm
                </div>

                <div className="mt-5 flex gap-2">
                  <Button variant="hero" onClick={handleSaveQuote} disabled={submitting}>
                    {submitting ? "Saving…" : "Save quote"}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/printers")}>
                    Browse all printers
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <div className="mt-3 font-display text-lg font-semibold">Drop an STL to see the quote</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  We'll slice it locally — nothing leaves your browser until you save.
                </div>
              </div>
            )}

            {slice && matches.length > 0 && (
              <>
                <div className="rounded-3xl border border-border bg-card p-2 shadow-soft">
                  <PrinterMap pins={mapPins} className="h-64 w-full overflow-hidden rounded-2xl" />
                </div>

                <div>
                  <h2 className="font-display text-xl font-semibold">Top matches</h2>
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
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <Badge tone={m.hasMaterial ? "ok" : "off"}>{m.hasMaterial ? "✓" : "✗"} {material}</Badge>
                              {colorName && (
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
