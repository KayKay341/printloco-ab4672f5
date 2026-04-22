import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Star, Map as MapIcon, List, Layers, Package } from "lucide-react";
import { toast } from "sonner";
import PrinterMap from "@/components/PrinterMap";
import { COMMON_COLORS } from "@/components/ColorPicker";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters } from "@/lib/sampleData";
import BulkQuoteDialog from "@/components/BulkQuoteDialog";

type FilamentColor = { material: string; color_name: string; hex_code: string; in_stock: boolean };

type PrinterListing = {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  is_address_verified: boolean;
  has_ams: boolean;
  ams_slot_count: number;
  accepts_bulk: boolean;
  min_bulk_quantity: number;
  profiles: { full_name: string | null } | null;
  filament_colors: FilamentColor[];
};

const Printers = () => {
  const { isDemo } = useDemoMode();
  const [all, setAll] = useState<PrinterListing[]>([]);
  const [q, setQ] = useState("");
  const [material, setMaterial] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [amsOnly, setAmsOnly] = useState(false);
  const [bulkOnly, setBulkOnly] = useState(false);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [loading, setLoading] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrinter, setBulkPrinter] = useState<PrinterListing | null>(null);

  useEffect(() => {
    supabase
      .from("printers")
      .select("id, owner_id, brand, model, materials, price_per_gram, neighborhood, city, bio, latitude, longitude, is_address_verified, has_ams, ams_slot_count, accepts_bulk, min_bulk_quantity, profiles(full_name), filament_colors(material, color_name, hex_code, in_stock)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const real = (data as unknown as PrinterListing[]) ?? [];
        // In demo mode, top up the list with sample makers across LA + Santa
        // Monica so the discovery page feels populated before real makers join.
        if (isDemo) {
          setAll([...real, ...(getSamplePrinters(24) as unknown as PrinterListing[])]);
        } else {
          setAll(real);
        }
        setLoading(false);
      });
  }, [isDemo]);

  const filtered = useMemo(() => all.filter((p) => {
    const matchesQ = !q ||
      `${p.brand} ${p.model} ${p.neighborhood ?? ""} ${p.city ?? ""} ${p.profiles?.full_name ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
    const matchesMat = !material || p.materials.includes(material);
    const matchesColor = !color || p.filament_colors.some((c) => c.color_name === color && c.in_stock && (!material || c.material === material));
    const matchesAms = !amsOnly || p.has_ams;
    const matchesBulk = !bulkOnly || p.accepts_bulk;
    return matchesQ && matchesMat && matchesColor && matchesAms && matchesBulk;
  }), [all, q, material, color, amsOnly, bulkOnly]);

  const allMaterials = useMemo(() => Array.from(new Set(all.flatMap((p) => p.materials))), [all]);

  const mapPins = useMemo(
    () =>
      filtered
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          lng: p.longitude!,
          lat: p.latitude!,
          label: `${p.brand} ${p.model}`,
          color: p.filament_colors.find((c) => c.color_name === color)?.hex_code,
        })),
    [filtered, color]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="border-b border-border bg-gradient-hero">
          <div className="container py-16">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Discover</div>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Printers near <span className="italic text-primary">you</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Browse verified makers in your neighborhood. Filter by material and stocked color.
            </p>

            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-card sm:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-2">
                <Search className="h-4 w-4 text-primary" />
                <Input
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                  placeholder="Search brand, model, neighborhood…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                <option value="">Any material</option>
                {allMaterials.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                <option value="">Any color</option>
                {COMMON_COLORS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="flex gap-1 rounded-2xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-12">
          {loading ? (
            <div className="text-muted-foreground">Loading printers…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
              <h3 className="font-display text-2xl font-semibold">No printers match</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing filters, or be the first maker in your neighborhood.
              </p>
              <Button variant="hero" asChild className="mt-6">
                <Link to="/auth?mode=signup&role=maker">List your printer</Link>
              </Button>
            </div>
          ) : view === "map" ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <PrinterMap pins={mapPins} className="h-[560px] w-full" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const visibleColors = p.filament_colors
                  .filter((c) => c.in_stock && (!material || c.material === material))
                  .slice(0, 8);
                return (
                  <article key={p.id} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {p.neighborhood || p.city || "Local"}
                      </div>
                      {p.is_address_verified && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Verified</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-semibold">{p.brand} {p.model}</h3>
                    <div className="mt-1 text-sm text-muted-foreground">by {p.profiles?.full_name || "Anonymous Maker"}</div>
                    {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.materials.map((m) => (
                        <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{m}</span>
                      ))}
                    </div>
                    {visibleColors.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {visibleColors.map((c) => (
                          <span
                            key={`${c.material}-${c.color_name}`}
                            title={`${c.color_name} ${c.material}`}
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: c.hex_code }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <div className="text-sm">
                        <strong className="font-display text-lg text-foreground">${Number(p.price_per_gram).toFixed(2)}</strong>
                        <span className="text-muted-foreground"> / g</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" /> New
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Printers;
