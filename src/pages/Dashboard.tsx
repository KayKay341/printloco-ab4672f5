import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Plus, Upload, Printer, FileBox, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getSamplePrinters, getSampleStlFiles } from "@/lib/sampleData";

type PrinterRow = {
  id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  neighborhood: string | null;
};

type StlRow = {
  id: string;
  file_name: string;
  material: string;
  estimated_weight: number | null;
  estimated_price: number | null;
  created_at: string;
};

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { isDemo } = useDemoMode();
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [files, setFiles] = useState<StlRow[]>([]);
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (profile?.role === "maker") {
      supabase
        .from("printers")
        .select("id, brand, model, materials, price_per_gram, neighborhood")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          const real = (data as PrinterRow[]) ?? [];
          if (real.length === 0 && isDemo) {
            const samples = getSamplePrinters(24).slice(0, 3).map((s) => ({
              id: s.id,
              brand: s.brand,
              model: s.model,
              materials: s.materials,
              price_per_gram: s.price_per_gram,
              neighborhood: s.neighborhood,
            }));
            setPrinters(samples);
            setUsingSample(true);
          } else {
            setPrinters(real);
            setUsingSample(false);
          }
        });
    } else {
      supabase
        .from("stl_files")
        .select("id, file_name, material, estimated_weight, estimated_price, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          const real = (data as StlRow[]) ?? [];
          if (real.length === 0 && isDemo) {
            setFiles(getSampleStlFiles());
            setUsingSample(true);
          } else {
            setFiles(real);
            setUsingSample(false);
          }
        });
    }
  }, [user, profile?.role, isDemo]);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {profile?.role === "maker" ? "Maker Dashboard" : "Customer Dashboard"}
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
          </h1>
        </div>

        {profile?.role === "maker" ? (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Your printers</h2>
              <Button variant="hero" asChild>
                <Link to="/printers/new"><Plus className="h-4 w-4" /> Add printer</Link>
              </Button>
            </div>
            {printers.length === 0 ? (
              <EmptyState
                icon={<Printer className="h-8 w-8" />}
                title="No printers listed yet"
                desc="Add your first printer to start accepting orders."
                cta={<Button variant="hero" asChild><Link to="/printers/new">Add your first printer</Link></Button>}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {printers.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.neighborhood || "—"}</div>
                    <div className="mt-1 font-display text-xl font-semibold">{p.brand} {p.model}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.materials.map((m) => (
                        <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{m}</span>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <strong className="text-foreground">${Number(p.price_per_gram).toFixed(2)}</strong> / gram
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Your uploads & quotes</h2>
              <div className="flex gap-2">
                <Button variant="soft" asChild><Link to="/printers">Browse printers</Link></Button>
                <Button variant="hero" asChild><Link to="/upload"><Upload className="h-4 w-4" /> Upload STL</Link></Button>
              </div>
            </div>
            {files.length === 0 ? (
              <EmptyState
                icon={<FileBox className="h-8 w-8" />}
                title="No uploads yet"
                desc="Upload an STL file to get an instant quote."
                cta={<Button variant="hero" asChild><Link to="/upload">Upload your first STL</Link></Button>}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4">File</th>
                      <th className="p-4">Material</th>
                      <th className="p-4">Weight</th>
                      <th className="p-4">Quote</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id} className="border-t border-border">
                        <td className="p-4 font-medium">{f.file_name}</td>
                        <td className="p-4">{f.material}</td>
                        <td className="p-4">{f.estimated_weight ? `${f.estimated_weight}g` : "—"}</td>
                        <td className="p-4 font-semibold">{f.estimated_price ? `$${Number(f.estimated_price).toFixed(2)}` : "—"}</td>
                        <td className="p-4 text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

const EmptyState = ({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta: React.ReactNode }) => (
  <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
    <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    <div className="mt-6">{cta}</div>
  </div>
);

export default Dashboard;
