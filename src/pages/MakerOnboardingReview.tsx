import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboardingReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [experience, setExperience] = useState("");
  const [cert, setCert] = useState<File | null>(null);

  const expKey = user ? `onboarding:review:${user.id}` : "";

  // Restore progress from profile + localStorage
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone, zip_code")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.full_name) setFullName(prof.full_name);
      if (prof?.phone) setPhone(prof.phone);
      if (prof?.zip_code) setZip(prof.zip_code);
      try {
        const saved = localStorage.getItem(expKey);
        if (saved) setExperience(saved);
      } catch {}
    })();
  }, [user, expKey]);

  useEffect(() => {
    if (!expKey) return;
    localStorage.setItem(expKey, experience);
  }, [experience, expKey]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName || !phone || !zip) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, zip_code: zip })
        .eq("id", user.id);

      toast.success("Submitted for review! We'll email you once approved.");
      navigate("/onboarding/complete");
    } catch (err) {
      toast.error("Failed to submit for review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={4} steps={MAKER_STEPS} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Send info for review</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Share your contact info and any certifications. Our team reviews each maker before approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>ZIP code</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Experience (optional)</Label>
                <Textarea
                  placeholder="Years making, types of jobs, portfolio links…"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Certification / proof of purchase (optional)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setCert(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Submitting…" : "Submit for review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingReview;
