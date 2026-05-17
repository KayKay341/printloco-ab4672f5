import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Star, Map as MapIcon, List, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PrinterMap from "@/components/PrinterMap";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters } from "@/lib/sampleData";
import TierBadge from "@/components/TierBadge";
import { tierFromScore, type Tier } from "@/lib/tier";
import { getService, type ServiceDef } from "@/lib/services";

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
  accepts_3mf: boolean;
  accepts_bulk: boolean;
  min_bulk_quantity: number;
  verification_status: "verified" | "pending" | "unverified";
  quality_score: number;
  tier: "hobbyist" | "maker" | "professional";
  avg_rating: number;
  rating_count: number;
  total_orders: number;
  successful_orders: number;
  profiles?: { full_name: string | null };
  filament_colors: any[];
};

type SortMode = "smart" | "quality" | "price" | "newest";

const ServicePrinters = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { isDemo } = useDemoMode();
  const service = getService(serviceId || "");
  
  const [all, setAll] = useState<PrinterListing[]>([]);
  const [q, setQ] = useState("");
  const [material, setMaterial] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<Tier | "">("");
  const [sort, setSort] = useState<SortMode>("smart");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [loading, setLoading] = useState(true);

  // Generate service-specific sample data
  const getServiceSamplePrinters = (count: number): PrinterListing[] => {
    const basePrinters = getSamplePrinters(count);
    
    return basePrinters.map((printer, index) => {
      let modifiedPrinter = { ...printer };
      
      if (serviceId === "laser-cut") {
        modifiedPrinter = {
          ...printer,
          brand: ["Epilog", "Trotec", "Universal", "Glowforge", "Omtech"][index % 5],
          model: ["Zing", "Speedy", "P-Series", "Pro", "Aura"][index % 5],
          materials: ["Plywood", "Acrylic", "MDF", "Leather", "Paper"].slice(0, 2 + (index % 3)),
          has_ams: false,
          accepts_bulk: true,
          filament_colors: [],
        };
      } else if (serviceId === "embroidery") {
        modifiedPrinter = {
          ...printer,
          brand: ["Brother", "Janome", "Bernina", "Pfaff", "Singer"][index % 5],
          model: ["PR670E", "MB-7", "590", "Creative", "PQ1500SL"][index % 5],
          materials: ["Cotton", "Polyester", "Denim", "Leather", "Canvas"].slice(0, 2 + (index % 3)),
          has_ams: false,
          accepts_bulk: true,
          filament_colors: [],
        };
      }
      
      return modifiedPrinter;
    });
  };

  useEffect(() => {
    const loadPrinters = async () => {
      const samples = getServiceSamplePrinters(40);
      setAll(samples);
      setLoading(false);
      
      try {
        const { data, error } = await supabase
          .from("printers")
          .select("id, owner_id, brand, model, materials, price_per_gram, neighborhood, city, bio, latitude, longitude, is_address_verified, has_ams, ams_slot_count, accepts_bulk, min_bulk_quantity, verification_status, quality_score, tier, avg_rating, rating_count, profiles!printers_owner_profile_fkey(full_name), filament_colors(material, color_name, hex_code, in_stock)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        
        if (!error && data && data.length > 0) {
          const real = (data as unknown as PrinterListing[]) ?? [];
          if (real.length > 0) {
            setAll(real);
          }
        }
      } catch (error) {
        console.log("Using sample data - couldn't load real printers");
      }
    };
    
    loadPrinters();
  }, [serviceId]);

  const filtered = useMemo(() => {
    const list = all.filter((p) => {
      const matchesQ = !q ||
        `${p.brand} ${p.model} ${p.neighborhood ?? ""} ${p.city ?? ""} ${p.profiles?.full_name ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase());
      const matchesMat = !material || (p.materials || []).includes(material);
      const matchesTier = !tierFilter || (p.tier ?? tierFromScore(p.quality_score ?? 50)) === tierFilter;
      return matchesQ && matchesMat && matchesTier;
    });

    const sorted = [...list];
    if (sort === "smart") {
      sorted.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
    } else if (sort === "quality") {
      sorted.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
    } else if (sort === "price") {
      sorted.sort((a, b) => Number(a.price_per_gram) - Number(b.price_per_gram));
    }
    return sorted;
  }, [all, q, material, tierFilter, sort]);

  const allMaterials = useMemo(() => Array.from(new Set(all.flatMap((p) => p.materials || []))), [all]);

  const mapPins = useMemo(
    () =>
      filtered
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          lat: p.latitude!,
          lng: p.longitude!,
          label: `${p.brand} ${p.model}`,
          tier: (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50),
          rating: p.avg_rating,
          ratingCount: p.rating_count,
          neighborhood: p.neighborhood ?? p.city ?? "Local",
        })),
    [filtered]
  );

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="mt-2 text-muted-foreground">The requested service doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link to="/services">Browse Services</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`Find ${service.name} Near You — Local Makers on PrintLoco`}
        description={`Browse verified ${service.name.toLowerCase()} makers in your neighborhood. Filter by material, capacity, and quality. Same-day local production.`}
        path={`/printers/${serviceId}`}
      />
      <Navbar />
      <main>
        <section className="border-b border-border bg-gradient-hero">
          <div className="container py-16">
            <div className="mb-4">
              <Link to={`/order/${serviceId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to {service.shortName}
              </Link>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Discover</div>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              {service.name} near <span className="italic text-primary">you</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Every active {service.name.toLowerCase()} maker in your neighborhood. We never hide makers — just
              tell you why each one is ranked where it is.
            </p>

            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-card sm:flex-row sm:flex-wrap">
              <label className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-2">
                <Search className="h-4 w-4 text-primary" />
                <Input
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                  placeholder={`Search ${service.name.toLowerCase()} brands, models, neighborhood…`}
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
                {allMaterials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as Tier | "")}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                <option value="">Any tier</option>
                <option value="professional">Professional</option>
                <option value="maker">Verified Maker</option>
                <option value="hobbyist">Hobbyist</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium"
              >
                <option value="smart">Smart ranking</option>
                <option value="quality">Quality score</option>
                <option value="price">Lowest price</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-2xl border border-border px-4 py-2 text-sm font-medium transition-colors ${
                    view === "grid" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("map")}
                  className={`rounded-2xl border border-border px-4 py-2 text-sm font-medium transition-colors ${
                    view === "map" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  <MapIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{filtered.length}</strong> of {all.length} {service.name.toLowerCase()} makers
            </div>
          </div>
        </section>

        <section className="container py-12">
          {loading ? (
            <div className="text-muted-foreground">Loading {service.name.toLowerCase()} makers…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
              <h3 className="font-display text-2xl font-semibold">No {service.name.toLowerCase()} makers match</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing filters, or be the first {service.name.toLowerCase()} maker in your neighborhood.
              </p>
              <Button variant="hero" asChild className="mt-6">
                <Link to="/auth?mode=signup&role=maker">List your {service.name.toLowerCase()}</Link>
              </Button>
            </div>
          ) : view === "map" ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <PrinterMap pins={mapPins} className="h-[560px] w-full" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const tier: Tier = (p.tier as Tier) ?? tierFromScore(p.quality_score ?? 50);
                return (
                  <article key={p.id} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {p.neighborhood || p.city || "Local"}
                      </div>
                      <TierBadge tier={tier} score={p.quality_score} />
                    </div>

                    <h3 className="mt-2 font-display text-xl font-semibold">{p.brand} {p.model}</h3>
                    <div className="mt-1 text-sm text-muted-foreground">by {p.profiles?.full_name || "Anonymous Maker"}</div>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {(p.materials || []).slice(0, 4).map((m) => (
                        <span key={m} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {m}
                        </span>
                      ))}
                      {(p.materials || []).length > 4 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          +{(p.materials || []).length - 4}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-bold">${Number(p.price_per_gram).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {serviceId === "3d-print" ? "/g" : serviceId === "laser-cut" ? "/sheet" : "/job"}
                        </span>
                      </div>
                      {p.avg_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{p.avg_rating.toFixed(1)}</span>
                          {p.rating_count > 0 && (
                            <span className="text-xs text-muted-foreground">({p.rating_count})</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/order/${serviceId}?printer=${p.id}`}>Get Quote</Link>
                      </Button>
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

export default ServicePrinters;
