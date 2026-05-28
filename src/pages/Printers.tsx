import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Star, Map as MapIcon, List, Layers, Package, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import PrinterMap from "@/components/PrinterMap";
import { COMMON_COLORS } from "@/components/ColorPicker";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters } from "@/lib/sampleData";
import BulkQuoteDialog from "@/components/BulkQuoteDialog";
import TierBadge from "@/components/TierBadge";
import { tierFromScore, type Tier } from "@/lib/tier";
import { SERVICES, type ServiceDef } from "@/lib/services";

type FilamentColor = { material: string; color_name: string; hex_code: string; in_stock: boolean };

type ServiceDbKey = ServiceDef["dbKey"];

type PrinterListing = {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  service: ServiceDbKey;
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
  verification_status: string;
  quality_score: number;
  tier: Tier;
  avg_rating: number;
  rating_count: number;
  profiles: { full_name: string | null } | null;
  filament_colors: FilamentColor[];
};

type SortMode = "smart" | "quality" | "price" | "newest";
type ServiceFilter = "all" | ServiceDbKey;

const Printers = () => {
  const { isDemo } = useDemoMode();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [all, setAll] = useState<PrinterListing[]>([]);
  const [q, setQ] = useState("");
  const [material, setMaterial] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [amsOnly, setAmsOnly] = useState(false);
  const [bulkOnly, setBulkOnly] = useState(false);
  const [tierFilter, setTierFilter] = useState<Tier | "">("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>(
    (searchParams.get("service") as ServiceFilter) || "all",
  );
  const [sort, setSort] = useState<SortMode>("smart");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [loading, setLoading] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrinter, setBulkPrinter] = useState<PrinterListing | null>(null);

  useEffect(() => {
    // Only show listings the maker has explicitly published live.
    supabase
      .from("printers")
      .select("id, owner_id, brand, model, service, materials, price_per_gram, neighborhood, city, bio, latitude, longitude, is_address_verified, has_ams, ams_slot_count, accepts_bulk, min_bulk_quantity, verification_status, quality_score, tier, avg_rating, rating_count, profiles!printers_owner_profile_fkey(full_name), filament_colors(material, color_name, hex_code, in_stock)")
      .eq("is_active", true)
      .eq("published", true)
      .order("created_at", { ascending: false })

      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const real = (data as unknown as PrinterListing[]) ?? [];
        if (isDemo) {
          // Mix in user-published demo printers (from localStorage) + sample seed.
          import("@/lib/demoStore").then(({ demoStore }) => {
            const userDemo = demoStore.get().printers.map((p) => ({
              id: p.id,
              owner_id: "demo",
              brand: p.brand,
              model: p.model,
              materials: p.materials,
              price_per_gram: p.pricePerGram,
              neighborhood: p.neighborhood,
              city: p.city,
              bio: p.bio,
              has_ams: p.hasAms,
              ams_slot_count: p.amsSlotCount,
              accepts_3mf: p.accepts3mf,
              accepts_bulk: p.acceptsBulk,
              min_bulk_quantity: p.minBulkQty,
              quality_score: p.qualityScore,
              tier: p.tier,
              verification_status: "verified",
              avg_rating: 0,
              rating_count: 0,
              total_orders: 0,
              successful_orders: 0,
              latitude: 34.02 + Math.random() * 0.05,
              longitude: -118.45 + Math.random() * 0.05,
              is_address_verified: true,
              material_prices: {},
              profiles: { full_name: "You" },
              filament_colors: [],
            } as unknown as PrinterListing));
            setAll([...userDemo, ...real, ...(getSamplePrinters(60) as unknown as PrinterListing[])]);
          });
        } else {
          setAll(real);
        }
        setLoading(false);
      });
  }, [isDemo]);

  // Scroll the focused listing into view once data is ready.
  useEffect(() => {
    if (!focusId || loading) return;
    const el = cardRefs.current[focusId];
    if (el) {
      setView("grid");
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }, [focusId, loading, all]);


  const filtered = useMemo(() => {
    const list = all.filter((p) => {
      const matchesQ = !q ||
        `${p.brand} ${p.model} ${p.neighborhood ?? ""} ${p.city ?? ""} ${p.profiles?.full_name ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchesService = serviceFilter === "all" || (p.service ?? "3d_print") === serviceFilter;
      const matchesMat = !material || p.materials.includes(material);
      const matchesColor = !color || p.filament_colors.some((c) => c.color_name === color && c.in_stock && (!material || c.material === material));
      const matchesAms = !amsOnly || p.has_ams;
      const matchesBulk = !bulkOnly || p.accepts_bulk;
      const matchesTier = !tierFilter || (p.tier ?? tierFromScore(p.quality_score ?? 50)) === tierFilter;
      return matchesQ && matchesService && matchesMat && matchesColor && matchesAms && matchesBulk && matchesTier;
    });

    const sorted = [...list];
    if (sort === "smart") {
      // Smart = quality + recency. Always shows newcomers a fair share by
      // mixing in newest-first within the same tier band.
      sorted.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
    } else if (sort === "quality") {
      sorted.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
    } else if (sort === "price") {
      sorted.sort((a, b) => Number(a.price_per_gram) - Number(b.price_per_gram));
    }
    return sorted;
  }, [all, q, material, color, amsOnly, bulkOnly, tierFilter, sort]);

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

  // Build a transparent reason chip per card so customers always know WHY a
  // printer is positioned where it is (3D Hubs cause #5).
  const reasonFor = (p: PrinterListing): string => {
    const bits: string[] = [];
    if (p.tier === "professional") bits.push("Pro grade");
    else if (p.tier === "maker") bits.push("Verified");
    if (p.avg_rating >= 4.7 && p.rating_count >= 3) bits.push("Top rated");
    if (color && p.filament_colors.some((c) => c.color_name === color && c.in_stock)) bits.push("Color in stock");
    if (Number(p.price_per_gram) <= 0.18) bits.push("Low price");
    if (p.has_ams) bits.push("Multi-color");
    return bits.slice(0, 2).join(" · ") || "Local maker";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find a 3D Printer Near You — Local Makers on PrintLoco"
        description="Browse verified 3D printer makers in your neighborhood. Filter by material, color, AMS multi-color, and bulk capacity. Same-day local prints."
        path="/printers"
      />
      <Navbar />
      <main>
        <section className="border-b border-border bg-gradient-hero">
          <div className="container py-16">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Discover</div>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Printers near <span className="italic text-primary">you</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Every active maker in your neighborhood. We never hide makers — just
              tell you why each one is ranked where it is.
            </p>

            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-card sm:flex-row sm:flex-wrap">
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
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as Tier | "")}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                <option value="">Any tier</option>
                <option value="professional">Professional grade</option>
                <option value="maker">Verified maker</option>
                <option value="hobbyist">Hobbyist</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
                title="Sort"
              >
                <option value="smart">Smart sort</option>
                <option value="quality">Quality score</option>
                <option value="price">Lowest price</option>
                <option value="newest">Newest</option>
              </select>
              <button
                type="button"
                onClick={() => setAmsOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${amsOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                title="Show only AMS / multi-color printers"
              >
                <Layers className="h-3.5 w-3.5" /> AMS
              </button>
              <button
                type="button"
                onClick={() => setBulkOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${bulkOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                title="Open to bulk / contract orders"
              >
                <Package className="h-3.5 w-3.5" /> Bulk
              </button>
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

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-primary" />
              Showing <strong className="text-foreground">{filtered.length}</strong> of {all.length} makers — every print is backed by our 7-day reprint guarantee.
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
                const tier: Tier = (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50);
                const isFocused = focusId === p.id;
                return (
                  <article
                    key={p.id}
                    ref={(el) => { cardRefs.current[p.id] = el; }}
                    className={`group rounded-2xl border bg-card p-6 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5 ${isFocused ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {p.neighborhood || p.city || "Local"}
                      </div>
                      <TierBadge tier={tier} score={p.quality_score} />
                    </div>

                    <h3 className="mt-2 font-display text-xl font-semibold">{p.brand} {p.model}</h3>
                    <div className="mt-1 text-sm text-muted-foreground">by {p.profiles?.full_name || "Anonymous Maker"}</div>

                    {/* Transparent ranking reason */}
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Info className="h-3 w-3" /> {reasonFor(p)}
                    </div>

                    {/* Rating + verification row */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {p.rating_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <strong className="text-foreground">{Number(p.avg_rating).toFixed(1)}</strong>
                          <span>({p.rating_count})</span>
                        </span>
                      ) : (
                        <span>New maker</span>
                      )}
                      {p.verification_status === "verified" && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {p.has_ams && (
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3 w-3" /> AMS · {p.ams_slot_count}
                        </span>
                      )}
                    </div>

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
                      {p.accepts_bulk && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setBulkPrinter(p); setBulkOpen(true); }}
                        >
                          <Package className="h-3.5 w-3.5" /> Bulk quote
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <BulkQuoteDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          printer={bulkPrinter as any}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Printers;
