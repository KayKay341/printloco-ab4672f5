import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MapPin, Star, Search, Filter, Printer as PrinterIcon, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters } from "@/lib/sampleData";

type FilamentColor = { material: string; color_name: string; hex_code: string; in_stock: boolean };

type PrinterRow = {
  id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
  city: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  has_ams: boolean;
  accepts_3mf: boolean;
  verification_status: string;
  quality_score: number;
  avg_rating: number;
  rating_count: number;
  filament_colors: FilamentColor[];
};

type Props = {
  /** Material the buyer wants printed (PLA / PETG / ABS / …). */
  material: string;
  /** Estimated grams from the slicer to compute total cost. */
  weightGrams: number;
  /** True when the source file is a 3MF — only show printers that accept it. */
  is3mf?: boolean;
  onSelect?: (printer: PrinterRow, totalCost: number) => void;
};

type SortMode = "match" | "price" | "rating" | "distance";

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const PrinterMatches = ({ material, weightGrams, is3mf = false, onSelect }: Props) => {
  const { isDemo } = useDemoMode();
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [maxRadius, setMaxRadius] = useState(50); // miles, 0 = any
  const [maxPrice, setMaxPrice] = useState(2); // $/gram
  const [color, setColor] = useState("");
  const [sort, setSort] = useState<SortMode>("match");
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("printers")
      .select(
        "id, brand, model, materials, price_per_gram, neighborhood, city, zip_code, latitude, longitude, has_ams, accepts_3mf, verification_status, quality_score, avg_rating, rating_count, filament_colors(material, color_name, hex_code, in_stock)"
      )
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const real = (data as unknown as PrinterRow[]) ?? [];
        if (isDemo) {
          const demo = getSamplePrinters(60).map((p) => ({
            id: p.id,
            brand: p.brand,
            model: p.model,
            materials: p.materials,
            price_per_gram: p.price_per_gram,
            neighborhood: p.neighborhood,
            city: p.city,
            zip_code: null,
            latitude: p.latitude,
            longitude: p.longitude,
            has_ams: p.has_ams,
            accepts_3mf: p.accepts_3mf,
            verification_status: p.verification_status,
            quality_score: p.quality_score,
            avg_rating: p.avg_rating,
            rating_count: p.rating_count,
            filament_colors: p.filament_colors,
          })) as PrinterRow[];
          setPrinters([...real, ...demo]);
        } else {
          setPrinters(real);
        }
        setLoading(false);
      });
  }, [isDemo]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 5_000 }
    );
  }, []);

  const allColors = useMemo(() => {
    const set = new Map<string, string>();
    printers.forEach((p) =>
      p.filament_colors?.forEach((c) => {
        if (!set.has(c.color_name)) set.set(c.color_name, c.hex_code);
      })
    );
    return Array.from(set.entries()).map(([name, hex]) => ({ name, hex }));
  }, [printers]);

  const filtered = useMemo(() => {
    const wanted = material.toUpperCase();
    const q = search.trim().toLowerCase();

    let list = printers
      .filter((p) => (p.materials ?? []).some((m) => m.toUpperCase() === wanted))
      .filter((p) => (is3mf ? p.accepts_3mf : true))
      .filter((p) => p.price_per_gram <= maxPrice)
      .filter((p) =>
        color
          ? p.filament_colors?.some(
              (c) => c.color_name.toLowerCase() === color.toLowerCase() && c.in_stock
            )
          : true
      )
      .filter((p) =>
        q
          ? `${p.brand} ${p.model} ${p.city ?? ""} ${p.neighborhood ?? ""} ${p.zip_code ?? ""}`
              .toLowerCase()
              .includes(q)
          : true
      )
      .map((p) => {
        const distance =
          userLoc && p.latitude && p.longitude
            ? haversineMiles(userLoc, { lat: p.latitude, lng: p.longitude })
            : null;
        const totalCost = p.price_per_gram * Math.max(weightGrams, 0);
        const turnaroundDays = Math.max(
          1,
          Math.round(2 + (3 - Math.min(p.quality_score, 100) / 40))
        );
        return { p, distance, totalCost, turnaroundDays };
      })
      .filter((row) => (maxRadius > 0 && row.distance != null ? row.distance <= maxRadius : true));

    list.sort((a, b) => {
      switch (sort) {
        case "price":
          return a.totalCost - b.totalCost;
        case "rating":
          return (b.p.avg_rating || 0) - (a.p.avg_rating || 0);
        case "distance":
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        case "match":
        default: {
          // Composite: lower price + higher quality + closer is better.
          const score = (row: typeof a) =>
            row.totalCost * 1.0 -
            (row.p.quality_score || 0) * 0.05 +
            (row.distance ?? 25) * 0.05;
          return score(a) - score(b);
        }
      }
    });

    return list;
  }, [printers, material, search, maxPrice, color, sort, maxRadius, userLoc, weightGrams, is3mf]);

  const top = filtered.slice(0, 6);

  return (
    <section className="rounded-lg border border-slicer-border bg-slicer-panel p-4 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-base font-bold tracking-normal text-slicer-foreground">
            Matched Printers
          </h2>
          <p className="text-xs text-slicer-muted">
            {weightGrams > 0
              ? `Showing printers that can print ~${Math.round(weightGrams)}g of ${material}${is3mf ? " from your 3MF" : ""}.`
              : "Upload a model to see live cost estimates from each printer."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="soft"
            onClick={() => setShowFilters((v) => !v)}
            className="min-h-11 border-slicer-border bg-slicer-panel-strong text-slicer-foreground"
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button asChild variant="ghost" className="min-h-11 text-slicer-cyan hover:bg-slicer-cyan/10">
            <Link to="/printers">Browse all <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slicer-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, ZIP, brand, or model"
            className="min-h-11 border-slicer-border bg-slicer-panel-strong pl-9 text-slicer-foreground placeholder:text-slicer-muted"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["match", "price", "rating", "distance"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              className={`min-h-11 rounded-md border px-3 text-xs font-bold uppercase tracking-wide transition ${
                sort === mode
                  ? "border-slicer-cyan bg-slicer-cyan/15 text-slicer-cyan"
                  : "border-slicer-border bg-slicer-panel-strong text-slicer-muted hover:text-slicer-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 grid gap-4 rounded-md border border-slicer-border bg-slicer-panel-strong p-3 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slicer-muted">
              <span>Max distance</span>
              <span className="text-slicer-foreground">{maxRadius === 0 ? "Any" : `${maxRadius} mi`}</span>
            </div>
            <Slider
              min={0}
              max={250}
              step={5}
              value={[maxRadius]}
              onValueChange={(v) => setMaxRadius(v[0])}
            />
            {!userLoc && (
              <p className="mt-1 text-[11px] text-slicer-muted">
                Allow location to filter by distance.
              </p>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slicer-muted">
              <span>Max $/gram</span>
              <span className="text-slicer-foreground">${maxPrice.toFixed(2)}</span>
            </div>
            <Slider min={0.05} max={2} step={0.05} value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} />
          </div>
          <div>
            <div className="mb-2 text-xs text-slicer-muted">Filament color</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setColor("")}
                className={`min-h-9 rounded-md border px-2 text-xs ${
                  color === ""
                    ? "border-slicer-cyan text-slicer-cyan"
                    : "border-slicer-border text-slicer-muted hover:text-slicer-foreground"
                }`}
              >
                Any
              </button>
              {allColors.slice(0, 10).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name === color ? "" : c.name)}
                  className={`flex min-h-9 items-center gap-1 rounded-md border px-2 text-xs ${
                    color === c.name
                      ? "border-slicer-cyan text-slicer-cyan"
                      : "border-slicer-border text-slicer-muted hover:text-slicer-foreground"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full border border-slicer-border" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading && <div className="text-sm text-slicer-muted">Finding printers…</div>}
        {!loading && top.length === 0 && (
          <div className="rounded-md border border-dashed border-slicer-border p-4 text-center text-sm text-slicer-muted">
            No printers match these filters yet.{" "}
            <Link to="/printers" className="text-slicer-cyan underline">
              Browse all printers
            </Link>
            .
          </div>
        )}
        {top.map(({ p, distance, totalCost, turnaroundDays }) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p, totalCost)}
            className="group flex w-full flex-col gap-2 rounded-md border border-slicer-border bg-slicer-panel-strong p-3 text-left transition hover:border-slicer-cyan sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <PrinterIcon className="h-4 w-4 text-slicer-cyan" />
                <div className="truncate text-sm font-bold text-slicer-foreground">
                  {p.brand} {p.model}
                </div>
                {p.verification_status === "verified" && (
                  <ShieldCheck className="h-4 w-4 text-slicer-green" aria-label="Verified" />
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slicer-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[p.neighborhood, p.city].filter(Boolean).join(", ") || p.zip_code || "Location hidden"}
                  {distance != null && <span>· {distance.toFixed(1)} mi</span>}
                </span>
                {p.rating_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-slicer-warning" />
                    {p.avg_rating.toFixed(1)} ({p.rating_count})
                  </span>
                )}
                <span>~{turnaroundDays}d turnaround</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-slicer-foreground">
                  ${totalCost.toFixed(2)}
                </div>
                <div className="text-[11px] text-slicer-muted">
                  ${p.price_per_gram.toFixed(2)}/g
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slicer-muted transition group-hover:text-slicer-cyan" />
            </div>
          </button>
        ))}
        {!loading && filtered.length > top.length && (
          <Link
            to="/printers"
            className="block text-center text-xs font-bold uppercase tracking-wide text-slicer-cyan hover:underline"
          >
            See all {filtered.length} matching printers →
          </Link>
        )}
      </div>
    </section>
  );
};

export default PrinterMatches;
