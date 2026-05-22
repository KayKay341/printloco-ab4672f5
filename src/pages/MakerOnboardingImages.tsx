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

const MakerOnboardingImages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid contact email.");
      return;
    }
    if (!files || files.length < 3) {
      toast.error("Please upload at least 3 photos.");
      return;
    }
    setLoading(true);

    try {
      // Save contact email on profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ contact_email: email })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      // Upload each photo to storage
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/verify-${Date.now()}-${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("printer-verification")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from("printer-verification").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      // Attach URLs and mark pending on the maker's latest printer
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
              Confirm your contact email and upload at least 3 photos of your machine, including one showing the serial number or proof of purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label>Machine photos (3+ required)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => setFiles(e.target.files)}
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading || !files || files.length < 3 || !email}>
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
