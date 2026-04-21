import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileBox } from "lucide-react";
import { toast } from "sonner";

const MATERIAL_PRICES: Record<string, number> = {
  PLA: 0.2,
  PETG: 0.25,
  ABS: 0.25,
  TPU: 0.45,
  Nylon: 0.6,
  Resin: 0.8,
};

const Upload = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState("PLA");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="container py-24">Loading…</div>;
  if (!user) return <Navigate to={`/auth?mode=signin`} replace />;

  // Rough estimate: STL file size ~ correlates loosely with print weight.
  // We use 1g per 25KB as a placeholder heuristic — replaced by real slicer later.
  const estimatedWeight = file ? Math.max(5, Math.round(file.size / 25000)) : 0;
  const estimatedPrice = estimatedWeight * (MATERIAL_PRICES[material] ?? 0.2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an STL file.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".stl")) {
      toast.error("Please upload a .stl file.");
      return;
    }
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("stl-files")
        .upload(path, file, { contentType: "model/stl", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("stl_files").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        material,
        estimated_weight: estimatedWeight,
        estimated_price: Number(estimatedPrice.toFixed(2)),
      });
      if (insErr) throw insErr;

      toast.success("Quote saved!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-2xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Get a quote</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Upload your STL</h1>
        <p className="mt-2 text-muted-foreground">
          Drop a file, pick a material — we'll save a draft quote you can send to any local maker.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-3xl border border-border bg-card p-8 shadow-soft">
          <label
            htmlFor="stl"
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
              file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              {file ? <FileBox className="h-7 w-7" /> : <UploadIcon className="h-7 w-7" />}
            </div>
            <div className="font-display text-lg font-semibold">
              {file ? file.name : "Click to choose an STL"}
            </div>
            <div className="text-xs text-muted-foreground">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 50MB · .stl only"}
            </div>
            <input
              id="stl"
              type="file"
              accept=".stl,model/stl"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div>
            <Label>Material</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(MATERIAL_PRICES).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMaterial(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    material === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  {m} · ${MATERIAL_PRICES[m].toFixed(2)}/g
                </button>
              ))}
            </div>
          </div>

          {file && (
            <div className="rounded-2xl bg-gradient-hero p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated quote</div>
              <div className="mt-1 font-display text-4xl font-semibold">${estimatedPrice.toFixed(2)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                ~{estimatedWeight}g of {material} · final price set by maker
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={submitting || !file}>
              {submitting ? "Uploading…" : "Save quote"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Upload;
