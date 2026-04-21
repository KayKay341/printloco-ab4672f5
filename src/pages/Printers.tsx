import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Star } from "lucide-react";
import { toast } from "sonner";

type PrinterListing = {
  id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
  bio: string | null;
  profiles: { full_name: string | null } | null;
};

const Printers = () => {
  const [all, setAll] = useState<PrinterListing[]>([]);
  const [q, setQ] = useState("");
  const [material, setMaterial] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("printers")
      .select("id, brand, model, materials, price_per_gram, neighborhood, bio, profiles(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setAll((data as unknown as PrinterListing[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = all.filter((p) => {
    const matchesQ = !q ||
      `${p.brand} ${p.model} ${p.neighborhood ?? ""} ${p.profiles?.full_name ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
    const matchesMat = !material || p.materials.includes(material);
    return matchesQ && matchesMat;
  });

  const allMaterials = Array.from(new Set(all.flatMap((p) => p.materials)));

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
              Browse verified makers in your neighborhood. Filter by material, message before you order, and pick up the same day.
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
            </div>
          </div>
        </section>

        <section className="container py-12">
          {loading ? (
            <div className="text-muted-foreground">Loading printers…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
              <h3 className="font-display text-2xl font-semibold">No printers yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Be the first maker in your neighborhood.
              </p>
              <Button variant="hero" asChild className="mt-6">
                <Link to="/auth?mode=signup&role=maker">List your printer</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <article key={p.id} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-card hover:-translate-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {p.neighborhood || "Local"}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold">{p.brand} {p.model}</h3>
                  <div className="mt-1 text-sm text-muted-foreground">by {p.profiles?.full_name || "Anonymous Maker"}</div>
                  {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.materials.map((m) => (
                      <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{m}</span>
                    ))}
                  </div>
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
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Printers;
