import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ColorPicker, { COMMON_COLORS } from "@/components/ColorPicker";
import PrinterMap from "@/components/PrinterMap";
import { toast } from "sonner";
import { CheckCircle2, MapPin } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";

const ALL_MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Nylon", "Resin"];

type Preset = {
  id: string;
  brand: string;
  model: string;
  build_volume: string;
  materials: string[];
  popularity: number;
  suggested_prices: Record<string, number>;
};

const NewPrinter = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isDemo, demoToast } = useDemoMode();
  const navigate = useNavigate();

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string | null>(null);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [buildVolume, setBuildVolume] = useState("");
  const [materials, setMaterials] = useState<string[]>(["PLA"]);
  const [pricePerGram, setPricePerGram] = useState("0.20");

  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");
  const [zipCode, setZipCode] = useState(profile?.zip_code ?? "");
  const [bio, setBio] = useState("");

  const [colors, setColors] = useState<string[]>(["Black", "White"]);
  const [verified, setVerified] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const toggleColor = (name: string) => {
    setColors((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const applyPreset = (p: Preset) => {
    setPresetId(p.id);
    setBrand(p.brand);
    setModel(p.model);
    setBuildVolume(p.build_volume);
    setMaterials(p.materials);
    const firstMat = p.materials[0];
    const sug = p.suggested_prices?.[firstMat];
    if (sug) setPricePerGram(String(sug));
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
    if (isDemo) {
      demoToast("publish a real printer listing");
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

      const { data: inserted, error } = await supabase
        .from("printers")
        .insert({
          owner_id: user.id,
          brand,
          model,
          build_volume: buildVolume || null,
          materials,
          price_per_gram: Number(pricePerGram),
          neighborhood: neighborhood || null,
          zip_code: zipCode || null,
          bio: bio || null,
          preset_id: presetId,
        })
        .select()
        .single();
      if (error) throw error;

      // Verify + geocode
      await handleVerifyAddress(inserted.id);

      // Insert filament colors
      if (colors.length > 0) {
        const rows = materials.flatMap((mat) =>
          colors.map((cName) => {
            const c = COMMON_COLORS.find((x) => x.name === cName)!;
            return { printer_id: inserted.id, material: mat, color_name: c.name, hex_code: c.hex };
          })
        );
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
      <Navbar />
      <main className="container max-w-3xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">For Makers</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">List your printer</h1>
        <p className="mt-2 text-muted-foreground">
          Pick from popular presets, declare your filaments, and verify your address on the map.
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-8 shadow-soft">
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

          <div>
            <Label htmlFor="bv">Build volume (optional)</Label>
            <Input id="bv" value={buildVolume} onChange={(e) => setBuildVolume(e.target.value)} placeholder="256 × 256 × 256 mm" />
          </div>

          <div>
            <Label>Materials</Label>
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
          </div>

          <div>
            <Label>Filament colors in stock</Label>
            <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-12">
              {COMMON_COLORS.map((c) => {
                const selected = colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleColor(c.name)}
                    title={c.name}
                    className={`relative aspect-square rounded-xl border-2 transition-all ${
                      selected ? "border-foreground scale-110 shadow-card" : "border-border opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{colors.length} color{colors.length !== 1 && "s"} selected</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ppg">Price per gram ($)</Label>
              <Input id="ppg" type="number" step="0.01" min="0" value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="nb">Neighborhood (public)</Label>
              <Input id="nb" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Prospect Heights" />
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
