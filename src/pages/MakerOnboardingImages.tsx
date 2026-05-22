import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";
import { X, Upload, Camera } from "lucide-react";

const MakerOnboardingImages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  // Restore email + previously uploaded photos from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("contact_email")
        .eq("id", user.id)
        .maybeSingle();
      setEmail(prof?.contact_email || user.email || "");

      const { data: printers } = await supabase
        .from("printers")
        .select("sample_print_urls")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const urls = printers?.[0]?.sample_print_urls || [];
      setExistingUrls(urls);
    })();
  }, [user]);


  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const next = [...photos];
    Array.from(incoming).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      // dedupe by name+size
      if (!next.some((p) => p.name === f.name && p.size === f.size)) {
        next.push(f);
      }
    });
    setPhotos(next);
    toast.success(`${incoming.length} photo${incoming.length > 1 ? "s" : ""} added`);
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid contact email.");
      return;
    }
    if (photos.length + existingUrls.length < 3) {
      toast.error("Please upload at least 3 photos.");
      return;
    }
    setLoading(true);

    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ contact_email: email })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/verify-${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("printer-verification")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from("printer-verification").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { data: printers } = await supabase
        .from("printers")
        .select("id, sample_print_urls")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const printer = printers?.[0];
      if (printer) {
        const merged = Array.from(new Set([...(printer.sample_print_urls || []), ...urls]));
        const { error: updateErr } = await supabase
          .from("printers")
          .update({ verification_status: "pending", sample_print_urls: merged })
          .eq("id", printer.id);
        if (updateErr) throw updateErr;
      }

      toast.success("Photos uploaded! Now send your info for review.");
      navigate("/onboarding/review");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to upload images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={3} steps={MAKER_STEPS} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Verify your machine</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Confirm your contact email and upload at least 3 photos of your machine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">We'll use this to reach you about verification and orders.</p>
              </div>

              <div className="space-y-3">
                <Label>Machine photos (3+ required)</Label>
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-sm font-medium">Please include photos of:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                    <li>The full machine (clearly visible)</li>
                    <li>The serial number, barcode, or model label</li>
                    <li>A recent sample print you made on it</li>
                    <li>Proof of purchase (receipt, order page) is a plus</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background p-4 text-center cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload files</span>
                    <span className="text-xs text-muted-foreground">Choose multiple</span>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                  <label
                    htmlFor="camera-upload"
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background p-4 text-center cursor-pointer hover:bg-muted transition"
                  >
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Take photo</span>
                    <span className="text-xs text-muted-foreground">Use your camera</span>
                    <input
                      id="camera-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {photos.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-24 w-full rounded-md object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label="Remove photo"
                          className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {photos.length} of 3+ photos added
                </p>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading || photos.length < 3 || !email}>
                {loading ? "Uploading..." : "Submit for verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingImages;
