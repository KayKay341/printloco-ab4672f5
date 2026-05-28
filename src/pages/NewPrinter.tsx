import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { COMMON_COLORS } from "@/components/ColorPicker";
import PrinterMap from "@/components/PrinterMap";
import { toast } from "sonner";
import { CheckCircle2, Layers, Package, ShieldCheck } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { MATERIAL_BASE_PRICE } from "@/lib/stlSlicer";
import VerificationUploader from "@/components/VerificationUploader";
import EarningsEstimate from "@/components/EarningsEstimate";
import TierBadge from "@/components/TierBadge";
import { tierFromScore } from "@/lib/tier";

const ALL_MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resin"];

type Preset = {
  id: string;
  brand: string;
  model: string;
  build_volume: string;
  materials: string[];
  popularity: number;
  suggested_prices: Record<string, number>;
};

type ColorRow = {
  name: string;
  hex: string;
  material: string;
  surcharge: string; // dollars/gram surcharge on top of base
};

const NewPrinter = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isDemo, demoToast } = useDemoMode();
  const navigate = useNavigate();

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string | null>(null);

  const [service, setService] = useState<"3d_print" | "laser_cut" | "embroidery" | "vinyl">("3d_print");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [buildVolume, setBuildVolume] = useState("");
  const [materials, setMaterials] = useState<string[]>(["PLA"]);
  // Per-material base price ($/g). Falls back to defaults from MATERIAL_BASE_PRICE.
  const [materialPrices, setMaterialPrices] = useState<Record<string, string>>({
    PLA: String(MATERIAL_BASE_PRICE.PLA),
  });

  // AMS / multi-color
  const [hasAms, setHasAms] = useState(false);
  const [amsSlotCount, setAmsSlotCount] = useState(4);
  const [accepts3mf, setAccepts3mf] = useState(false);

  // Bulk
  const [acceptsBulk, setAcceptsBulk] = useState(true);
  const [minBulkQty, setMinBulkQty] = useState(10);

  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");
  const [zipCode, setZipCode] = useState(profile?.zip_code ?? "");
  const [bio, setBio] = useState("");

  // Filament inventory: each row = one (material, color) SKU with surcharge.
  const [inventory, setInventory] = useState<ColorRow[]>([
    { name: "Black", hex: "#111111", material: "PLA", surcharge: "0.00" },
    { name: "White", hex: "#F5F5F5", material: "PLA", surcharge: "0.00" },
  ]);

  const [verified, setVerified] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Verification (3D Hubs cause #4 fix — required to go live)
  const [printerPhotoUrl, setPrinterPhotoUrl] = useState<string | null>(null);
  const [samplePrintUrls, setSamplePrintUrls] = useState<string[]>([]);
  const [serialVisible, setSerialVisible] = useState(true);
  const [layerHeightMin, setLayerHeightMin] = useState("0.12");

  useEffect(() => {
    supabase
      .from("printer_presets")
      .select("*")
      .order("popularity", { ascending: false })
      .then(({ data }) => setPresets((data as unknown as Preset[]) ?? []));
  }, []);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  const toggleMat = (m: string) => {
    setMaterials((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      // Keep materialPrices in sync — seed defaults for new ones, drop removed.
      setMaterialPrices((prices) => {
        const updated: Record<string, string> = {};
        next.forEach((mat) => {
          updated[mat] = prices[mat] ?? String(MATERIAL_BASE_PRICE[mat] ?? 0.2);
        });
        return updated;
      });
      // Drop inventory rows whose material is no longer offered.
      setInventory((inv) => inv.filter((c) => next.includes(c.material)));
      return next;
    });
  };

  const addColorRow = () => {
    const firstMat = materials[0] ?? "PLA";
    setInventory((inv) => [
      ...inv,
      { name: "Black", hex: "#111111", material: firstMat, surcharge: "0.00" },
    ]);
  };

  const updateColorRow = (i: number, patch: Partial<ColorRow>) => {
    setInventory((inv) => inv.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const removeColorRow = (i: number) => {
    setInventory((inv) => inv.filter((_, idx) => idx !== i));
  };

  const applyPreset = (p: Preset) => {
    setPresetId(p.id);
    setBrand(p.brand);
    setModel(p.model);
    setBuildVolume(p.build_volume);
    setMaterials(p.materials);
    const seeded: Record<string, string> = {};
    p.materials.forEach((mat) => {
      seeded[mat] = String(p.suggested_prices?.[mat] ?? MATERIAL_BASE_PRICE[mat] ?? 0.2);
    });
    setMaterialPrices(seeded);
    // Bambu Lab presets ship with AMS by default
    if (p.brand.toLowerCase().includes("bambu")) {
      setHasAms(true);
      setAccepts3mf(true);
      setAmsSlotCount(4);
    }
  };

  const handleVerifyAddress = async (printerId: string) => {
    if (!address || address.length < 5) {
      toast.error("Enter a full street address first.");
      return null;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { printerId, address },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVerified({ lat: data.latitude, lng: data.longitude, address: data.address });
      if (data.zip_code) setZipCode(data.zip_code);
      toast.success("Address verified ✓");
      return data;
    } catch (err: any) {
      toast.error(err.message || "Could not verify address");
      return null;
    } finally {
      setVerifying(false);
    }
  };

  const cheapestPrice = useMemo(() => {
    const vals = Object.values(materialPrices).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    return vals.length ? Math.min(...vals) : 0.2;
  }, [materialPrices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (materials.length === 0) {
      toast.error("Select at least one material.");
      return;
    }
    if (!address) {
      toast.error("Add your address — required for matching.");
      return;
    }
    if (!printerPhotoUrl) {
      toast.error("Upload a photo of your printer (with serial visible) to verify.");
      return;
    }
    if (samplePrintUrls.length < 3) {
      toast.error("Upload 3 sample prints so customers know what to expect.");
      return;
    }
    if (isDemo) {
      // Simulated publish — saved to localStorage demo store.
      const { publishDemoPrinter } = await import("@/hooks/useDemoMode").then((m) => ({
        publishDemoPrinter: (input: any) => {
          const { demoStore } = require("@/lib/demoStore");
          return demoStore.addPrinter(input);
        },
      })).catch(() => ({ publishDemoPrinter: null }));
      // Direct path via the hook's helper (already in scope).
      const { demoStore } = await import("@/lib/demoStore");
      demoStore.addPrinter({
        brand,
        model,
        neighborhood: neighborhood || null,
        city: null,
        bio: bio || null,
        materials,
        pricePerGram: cheapestPrice,
        hasAms,
        amsSlotCount: hasAms ? amsSlotCount : 1,
        accepts3mf: hasAms ? accepts3mf : false,
        acceptsBulk,
        minBulkQty,
        qualityScore: Math.min(100, 60 + samplePrintUrls.length * 5 + (serialVisible ? 5 : 0)),
        tier: "maker",
      });
      toast.success("Demo printer published!", {
        description: "It now appears in /printers and your dashboard.",
      });
      navigate("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      if (profile?.role !== "maker") {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ role: "maker", neighborhood, zip_code: zipCode })
          .eq("id", user.id);
        if (upErr) throw upErr;
        await refreshProfile();
      }

      // Build material_prices jsonb
      const materialPricesJson: Record<string, number> = {};
      materials.forEach((mat) => {
        const v = Number(materialPrices[mat]);
        if (Number.isFinite(v) && v > 0) materialPricesJson[mat] = v;
      });

      const { data: inserted, error } = await supabase
        .from("printers")
        .insert({
          owner_id: user.id,
          brand,
          model,
          build_volume: buildVolume || null,
          materials,
          // Cheapest material as the "headline" price_per_gram for legacy code.
          price_per_gram: cheapestPrice,
          material_prices: materialPricesJson,
          neighborhood: neighborhood || null,
          zip_code: zipCode || null,
          bio: bio || null,
          preset_id: presetId,
          has_ams: hasAms,
          ams_slot_count: hasAms ? amsSlotCount : 1,
          accepts_3mf: hasAms ? accepts3mf : false,
          accepts_bulk: acceptsBulk,
          min_bulk_quantity: minBulkQty,
          printer_photo_url: printerPhotoUrl,
          sample_print_urls: samplePrintUrls,
          serial_visible: serialVisible,
          layer_height_min_mm: Number(layerHeightMin) || 0.2,
          verification_status: "pending",
          published: true,
        })
        .select()
        .single();
      if (error) throw error;

      // Verify + geocode
      await handleVerifyAddress(inserted.id);

      // Insert filament inventory rows
      if (inventory.length > 0) {
        const rows = inventory.map((c) => ({
          printer_id: inserted.id,
          material: c.material,
          color_name: c.name,
          hex_code: c.hex,
          surcharge_per_gram: Number(c.surcharge) || 0,
        }));
        await supabase.from("filament_colors").insert(rows);
      }

      toast.success("Printer added!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save printer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="List Your 3D Printer on PrintLoco — Earn From Local Orders"
        description="Turn your idle 3D printer into income. List on PrintLoco and get matched with neighbors who need same-day prints."
        path="/printers/new"
      />
      <Navbar />
      <main className="container max-w-3xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">For Makers</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">List your printer</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a preset, set per-material pricing, declare every color in stock, and verify your address.
        </p>

        {presets.length > 0 && (
          <section className="mt-8">
            <Label>Quick start with a preset</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {presets.slice(0, 9).map((p) => {
                const selected = presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`group rounded-2xl border p-4 text-left transition-all ${
                      selected ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.brand}</div>
                    <div className="mt-1 font-display text-base font-semibold">{p.model}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.build_volume}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Bambu Lab" required />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="X1 Carbon" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bv">Build volume</Label>
              <Input id="bv" value={buildVolume} onChange={(e) => setBuildVolume(e.target.value)} placeholder="256 × 256 × 256 mm" />
              <p className="mt-1 text-xs text-muted-foreground">Min recommended: 150 × 150 × 150 mm</p>
            </div>
            <div>
              <Label htmlFor="lh">Min layer height (mm)</Label>
              <Input
                id="lh"
                type="number"
                step="0.01"
                min="0.04"
                max="0.4"
                value={layerHeightMin}
                onChange={(e) => setLayerHeightMin(e.target.value)}
                placeholder="0.12"
              />
              <p className="mt-1 text-xs text-muted-foreground">≤ 0.20 mm required for verified tier.</p>
            </div>
          </div>

          {/* VERIFICATION (3D Hubs cause #4 fix) */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <Label className="text-base">Verification</Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Required to go live. We back every print with a 7-day reprint guarantee — verification protects buyers AND your reputation.
            </p>
            <div className="mt-4">
              <VerificationUploader
                userId={user.id}
                printerPhotoUrl={printerPhotoUrl}
                onPrinterPhoto={setPrinterPhotoUrl}
                samplePrintUrls={samplePrintUrls}
                onSamplePrints={setSamplePrintUrls}
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <Switch checked={serialVisible} onCheckedChange={setSerialVisible} />
              Serial number is visible in the printer photo
            </label>
            {(printerPhotoUrl && samplePrintUrls.length >= 3) && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-background/60 p-3 text-sm">
                <span className="text-muted-foreground">Projected tier:</span>
                <TierBadge tier={tierFromScore(60 + samplePrintUrls.length * 5 + (serialVisible ? 5 : 0))} />
              </div>
            )}
          </div>

          {/* MATERIALS + PRICES */}
          <div>
            <Label>Materials you print in</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_MATERIALS.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => toggleMat(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    materials.includes(m)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {materials.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Base price per gram
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {materials.map((mat) => (
                    <div key={mat} className="flex items-center gap-2">
                      <div className="w-16 text-sm font-semibold">{mat}</div>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-6"
                          value={materialPrices[mat] ?? ""}
                          onChange={(e) => setMaterialPrices((p) => ({ ...p, [mat]: e.target.value }))}
                          required
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">/g</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AMS */}
          <div className="rounded-2xl border border-border bg-background/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <Label className="text-base">AMS / multi-color printer</Label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Turn on if your printer has an automatic material system (Bambu AMS, Prusa MMU, etc.).
                </p>
              </div>
              <Switch checked={hasAms} onCheckedChange={setHasAms} />
            </div>

            {hasAms && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="slots">Slot count</Label>
                  <select
                    id="slots"
                    value={amsSlotCount}
                    onChange={(e) => setAmsSlotCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {[2, 4, 8, 12, 16].map((n) => (
                      <option key={n} value={n}>{n} slots</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={accepts3mf} onCheckedChange={setAccepts3mf} />
                    Accept Bambu .3mf multi-color jobs
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* BULK */}
          <div className="rounded-2xl border border-border bg-background/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <Label className="text-base">Open to bulk / contract jobs</Label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Buyers can request a custom quote for large quantities or recurring orders.
                </p>
              </div>
              <Switch checked={acceptsBulk} onCheckedChange={setAcceptsBulk} />
            </div>

            {acceptsBulk && (
              <div className="mt-4 max-w-xs">
                <Label htmlFor="minbulk">Minimum bulk quantity</Label>
                <Input
                  id="minbulk"
                  type="number"
                  min="2"
                  value={minBulkQty}
                  onChange={(e) => setMinBulkQty(Math.max(2, Number(e.target.value) || 2))}
                />
              </div>
            )}
          </div>

          {/* EARNINGS ESTIMATE (3D Hubs cause #2 fix — set realistic expectations) */}
          {materials.length > 0 && (
            <EarningsEstimate
              pricePerGram={cheapestPrice}
              hasAms={hasAms}
              acceptsBulk={acceptsBulk}
              materialsCount={materials.length}
            />
          )}

          {/* FILAMENT INVENTORY */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Filaments in stock</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addColorRow} disabled={materials.length === 0}>
                + Add filament
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Each row is one color SKU. Add a surcharge for premium filaments (silk, glow, marble).
            </p>

            <div className="mt-3 space-y-2">
              {inventory.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No filaments yet. Add at least one so buyers can pick a color.
                </div>
              )}
              {inventory.map((row, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-border bg-background p-2">
                  <input
                    type="color"
                    value={row.hex}
                    onChange={(e) => updateColorRow(i, { hex: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent"
                    aria-label="Color"
                  />
                  <select
                    value={row.name}
                    onChange={(e) => {
                      const preset = COMMON_COLORS.find((c) => c.name === e.target.value);
                      updateColorRow(i, { name: e.target.value, hex: preset?.hex ?? row.hex });
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    {COMMON_COLORS.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                    <option value={row.name}>Custom: {row.name}</option>
                  </select>
                  <select
                    value={row.material}
                    onChange={(e) => updateColorRow(i, { material: e.target.value })}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    {materials.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.surcharge}
                      onChange={(e) => updateColorRow(i, { surcharge: e.target.value })}
                      className="h-9 pl-7 text-sm"
                      placeholder="0.00"
                      title="Per-gram surcharge"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeColorRow(i)}
                    className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nb">Neighborhood (public)</Label>
              <Input id="nb" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Prospect Heights" />
            </div>
            <div>
              <Label htmlFor="zip">ZIP code</Label>
              <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="11238" />
            </div>
          </div>

          <div>
            <Label htmlFor="addr">Street address (private — for verification + map)</Label>
            <div className="mt-2 flex gap-2">
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Brooklyn, NY 11238" required />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Customers see your neighborhood — your full address is only used to verify location.
            </div>
            {verified && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Verified: {verified.address}
                </div>
                <div className="mt-2 h-48 overflow-hidden rounded-2xl border border-border">
                  <PrinterMap
                    pins={[{ id: "self", lng: verified.lng, lat: verified.lat, label: "Your location" }]}
                    zoom={13}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="bio">About your shop (optional)</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I print 7 days a week, fast turnaround on small parts." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={submitting || verifying}>
              {submitting ? "Saving…" : "Add printer"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default NewPrinter;
