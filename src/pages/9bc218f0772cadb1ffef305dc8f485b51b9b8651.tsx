import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
import { CheckCircle2, Layers, Package, ShieldCheck, Box, Flame, Sparkles, Scissors, Trash2 } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { MATERIAL_BASE_PRICE } from "@/lib/stlSlicer";
import VerificationUploader from "@/components/VerificationUploader";
import EarningsEstimate from "@/components/EarningsEstimate";
import TierBadge from "@/components/TierBadge";
import { tierFromScore } from "@/lib/tier";
import { SERVICES, type ServiceId } from "@/lib/services";

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
  id?: string;
  name: string;
  hex: string;
  material: string;
  surcharge: string; // dollars/gram surcharge on top of base
};

const MachineEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isDemo } = useDemoMode();
  const navigate = useNavigate();

  const [serviceId, setServiceId] = useState<ServiceId>("3d-print");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string | null>(null);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [buildVolume, setBuildVolume] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialPrices, setMaterialPrices] = useState<Record<string, string>>({});

  // AMS / multi-color
  const [hasAms, setHasAms] = useState(false);
  const [amsSlotCount, setAmsSlotCount] = useState(4);
  const [accepts3mf, setAccepts3mf] = useState(false);

  // Bulk
  const [acceptsBulk, setAcceptsBulk] = useState(true);
  const [minBulkQty, setMinBulkQty] = useState(10);

  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [bio, setBio] = useState("");

  const [inventory, setInventory] = useState<ColorRow[]>([]);

  const [verified, setVerified] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Verification
  const [printerPhotoUrl, setPrinterPhotoUrl] = useState<string | null>(null);
  const [samplePrintUrls, setSamplePrintUrls] = useState<string[]>([]);
  const [serialVisible, setSerialVisible] = useState(true);
  const [layerHeightMin, setLayerHeightMin] = useState("0.12");

  // Load machine data if editing
  useEffect(() => {
    if (isEditing && user) {
      supabase
        .from("printers")
        .select("*, filament_colors(*)")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            toast.error("Could not load machine data");
            navigate("/dashboard");
            return;
          }
          if (data) {
            setBrand(data.brand);
            setModel(data.model);
            setBuildVolume(data.build_volume || "");
            setMaterials(data.materials || []);
            setServiceId((data as any).service_type?.replace('_', '-') || "3d-print");
            
            const prices: Record<string, string> = {};
            const matPrices = data.material_prices as Record<string, number>;
            if (matPrices) {
              Object.entries(matPrices).forEach(([m, p]) => {
                prices[m] = String(p);
              });
            }
            setMaterialPrices(prices);
            
            setHasAms(data.has_ams);
            setAmsSlotCount(data.ams_slot_count);
            setAccepts3mf(data.accepts_3mf);
            setAcceptsBulk(data.accepts_bulk);
            setMinBulkQty(data.min_bulk_quantity);
            setNeighborhood(data.neighborhood || "");
            setZipCode(data.zip_code || "");
            setBio(data.bio || "");
            setPrinterPhotoUrl(data.printer_photo_url);
            setSamplePrintUrls(data.sample_print_urls || []);
            setSerialVisible(data.serial_visible);
            setLayerHeightMin(String(data.layer_height_min_mm || 0.2));
            
            if (data.filament_colors) {
              setInventory(data.filament_colors.map((c: any) => ({
                id: c.id,
                name: c.color_name,
                hex: c.hex_code,
                material: c.material,
                surcharge: String(c.surcharge_per_gram || 0)
              })));
            }
          }
        });
    }
  }, [id, isEditing, user]);

  // Load presets for current service
  useEffect(() => {
    supabase
      .from("printer_presets")
      .select("*")
      // .eq("service_type", serviceId.replace('-', '_')) // Wait for DB column
      .order("popularity", { ascending: false })
      .then(({ data }) => setPresets((data as unknown as Preset[]) ?? []));
  }, [serviceId]);

  const activeService = useMemo(() => SERVICES.find(s => s.id === serviceId)!, [serviceId]);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  const toggleMat = (m: string) => {
    setMaterials((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      setMaterialPrices((prices) => {
        const updated: Record<string, string> = {};
        next.forEach((mat) => {
          updated[mat] = prices[mat] ?? String(MATERIAL_BASE_PRICE[mat] ?? 0.2);
        });
        return updated;
      });
      setInventory((inv) => inv.filter((c) => next.includes(c.material)));
      return next;
    });
  };

  const addColorRow = () => {
    const firstMat = materials[0] ?? activeService.materials[0];
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
    if (p.brand.toLowerCase().includes("bambu")) {
      setHasAms(true);
      setAccepts3mf(true);
      setAmsSlotCount(4);
    }
  };

  const handleVerifyAddress = async (printerId: string) => {
    if (!address || address.length < 5) return null;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { printerId, address },
      });
      if (error) throw error;
      setVerified({ lat: data.latitude, lng: data.longitude, address: data.address });
      if (data.zip_code) setZipCode(data.zip_code);
      return data;
    } catch (err) {
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
    if (!isEditing && !address) {
      toast.error("Add your address — required for matching.");
      return;
    }
    if (!printerPhotoUrl) {
      toast.error("Upload a photo of your machine to verify.");
      return;
    }
    if (samplePrintUrls.length < 3) {
      toast.error("Upload 3 sample pieces so customers know what to expect.");
      return;
    }

    setSubmitting(true);
    try {
      if (profile?.role !== "maker") {
        await supabase.from("profiles").update({ role: "maker", neighborhood, zip_code: zipCode }).eq("id", user.id);
        await refreshProfile();
      }

      const materialPricesJson: Record<string, number> = {};
      materials.forEach((mat) => {
        const v = Number(materialPrices[mat]);
        if (Number.isFinite(v) && v > 0) materialPricesJson[mat] = v;
      });

      const payload = {
        owner_id: user.id,
        brand,
        model,
        build_volume: buildVolume || null,
        materials,
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
        service_type: serviceId.replace('-', '_'),
        published: true,
      };

      let printerId = id;

      if (isEditing) {
        const { error } = await supabase.from("printers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("printers").insert(payload).select().single();
        if (error) throw error;
        printerId = data.id;
        await handleVerifyAddress(printerId!);
      }

      // Update inventory (simple clear and re-insert for now)
      if (printerId) {
        await supabase.from("filament_colors").delete().eq("printer_id", printerId);
        if (inventory.length > 0) {
          const rows = inventory.map((c) => ({
            printer_id: printerId,
            material: c.material,
            color_name: c.name,
            hex_code: c.hex,
            surcharge_per_gram: Number(c.surcharge) || 0,
          }));
          await supabase.from("filament_colors").insert(rows);
        }
      }

      toast.success(isEditing ? "Machine updated!" : "Machine added!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save machine");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this listing? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("printers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Listing removed");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={isEditing ? `Edit ${brand} ${model} | PrintLoco` : "List Your Machine on PrintLoco"}
        description="Earn from your workshop. List your 3D printer, laser cutter, or embroidery machine on PrintLoco."
        path={isEditing ? `/printers/edit/${id}` : "/printers/new"}
      />
      <Navbar />
      <main className="container max-w-3xl py-12">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">For Makers</div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {isEditing ? "Edit machine" : "List your machine"}
            </h1>
          </div>
          {isEditing && (
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Remove Listing
            </Button>
          )}
        </div>

        {!isEditing && (
          <section className="mt-8">
            <Label>What kind of machine are you listing?</ Kraus>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SERVICES.map(s => {
                const Icon = s.icon;
                const active = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setMaterials([]);
                      setMaterialPrices({});
                      setInventory([]);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">{s.shortName}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {serviceId === "3d-print" && presets.length > 0 && (
          <section className="mt-8">
            <Label>Quick start with a preset</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {presets.slice(0, 9).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`group rounded-2xl border p-4 text-left transition-all ${
                    presetId === p.id ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.brand}</div>
                  <div className="mt-1 font-display text-base font-semibold">{p.model}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.build_volume}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={activeService.shortName === "3D Print" ? "Bambu Lab" : "Glowforge"} required />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={activeService.shortName === "3D Print" ? "X1 Carbon" : "Pro"} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bv">{activeService.id === 'embroidery' ? 'Hoop size' : 'Build / Bed volume'}</Label>
              <Input id="bv" value={buildVolume} onChange={(e) => setBuildVolume(e.target.value)} placeholder="256 × 256 mm" />
            </div>
            {serviceId === '3d-print' && (
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
              </div>
            )}
          </div>

          {/* VERIFICATION */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <Label className="text-base">Verification</Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              We back every order with a 7-day guarantee — verification protects buyers AND your reputation.
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
            {serviceId === '3d-print' && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <Switch checked={serialVisible} onCheckedChange={setSerialVisible} />
                Serial number is visible in the printer photo
              </label>
            )}
          </div>

          {/* MATERIALS + PRICES */}
          <div>
            <Label>Materials you support</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeService.materials.map((m) => (
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
                  Base pricing
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {materials.map((mat) => (
                    <div key={mat} className="flex items-center gap-2">
                      <div className="w-20 text-xs font-semibold truncate">{mat}</div>
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
                      <span className="text-[10px] text-muted-foreground">
                        {serviceId === '3d-print' ? '/g' : serviceId === 'laser-cut' ? '/min' : '/1k st'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AMS - Only for 3D Printing */}
          {serviceId === '3d-print' && (
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
          )}

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

          {/* INVENTORY */}
          <div>
            <div className="flex items-center justify-between">
              <Label>{serviceId === '3d-print' ? 'Filaments' : 'Stock colors'} in stock</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addColorRow} disabled={materials.length === 0}>
                + Add color
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {inventory.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No stock colors listed yet. Add at least one so buyers can pick.
                </div>
              )}
              {inventory.map((row, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-border bg-background p-2">
                  <input
                    type="color"
                    value={row.hex}
                    onChange={(e) => updateColorRow(i, { hex: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent"
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
                    />
                  </div>
                  <button type="button" onClick={() => removeColorRow(i)} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted">✕</button>
                </div>
              ))}
            </div>
          </div>

          {!isEditing && (
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
          )}

          {!isEditing && (
            <div>
              <Label htmlFor="addr">Street address (private — for verification)</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Brooklyn, NY 11238" required />
            </div>
          )}

          <div>
            <Label htmlFor="bio">About your shop (optional)</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fast turnaround, high quality." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={submitting || verifying}>
              {submitting ? "Saving…" : isEditing ? "Save changes" : "Add machine"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default MachineEditor;
