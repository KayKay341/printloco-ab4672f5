import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ALL_MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Nylon", "Resin"];

const NewPrinter = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [buildVolume, setBuildVolume] = useState("");
  const [materials, setMaterials] = useState<string[]>(["PLA"]);
  const [pricePerGram, setPricePerGram] = useState("0.20");
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? "");
  const [zipCode, setZipCode] = useState(profile?.zip_code ?? "");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to="/auth?mode=signin" replace />;

  const toggleMat = (m: string) => {
    setMaterials((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (materials.length === 0) {
      toast.error("Select at least one material.");
      return;
    }
    setSubmitting(true);
    try {
      // Upgrade to maker if needed
      if (profile?.role !== "maker") {
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ role: "maker", neighborhood, zip_code: zipCode })
          .eq("id", user.id);
        if (upErr) throw upErr;
        await refreshProfile();
      }

      const { error } = await supabase.from("printers").insert({
        owner_id: user.id,
        brand,
        model,
        build_volume: buildVolume || null,
        materials,
        price_per_gram: Number(pricePerGram),
        neighborhood: neighborhood || null,
        zip_code: zipCode || null,
        bio: bio || null,
      });
      if (error) throw error;
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
      <main className="container max-w-2xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">For Makers</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">List your printer</h1>
        <p className="mt-2 text-muted-foreground">
          Tell your neighborhood what you can print. You can edit this anytime.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-3xl border border-border bg-card p-8 shadow-soft">
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="ppg">Price per gram ($)</Label>
              <Input id="ppg" type="number" step="0.01" min="0" value={pricePerGram} onChange={(e) => setPricePerGram(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="nb">Neighborhood</Label>
              <Input id="nb" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Prospect Heights" />
            </div>
            <div>
              <Label htmlFor="zip">Zip code</Label>
              <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="11238" />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">About your shop (optional)</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="I print 7 days a week, fast turnaround on small parts." rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={submitting}>
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
