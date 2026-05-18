import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SERVICES } from "@/lib/services";
import { MACHINE_PRESETS } from "@/lib/machinePresets";
import { toast } from "sonner";
import { OnboardingSteps, MAKER_STEPS } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboarding = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    serviceId: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  const brands = useMemo(() => {
    if (!formData.serviceId || !MACHINE_PRESETS[formData.serviceId]) return [];
    return Object.keys(MACHINE_PRESETS[formData.serviceId]);
  }, [formData.serviceId]);

  const models = useMemo(() => {
    if (!formData.serviceId || !formData.brand || !MACHINE_PRESETS[formData.serviceId][formData.brand]) return [];
    return MACHINE_PRESETS[formData.serviceId][formData.brand];
  }, [formData.serviceId, formData.brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.serviceId || !formData.brand || !formData.model) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!photo) {
      toast.error("Please upload a photo of your machine.");
      return;
    }
    setLoading(true);

    try {
      await supabase
        .from("profiles")
        .update({ role: "maker" })
        .eq("id", user.id);

      await supabase
        .from("printers")
        .insert({
          owner_id: user.id,
          brand: formData.brand,
          model: formData.model,
          materials: ["PLA"], 
        });

      await refreshProfile();
      toast.success("Machine registered! Next: upload verification photos.");
      navigate("/onboarding/images");
    } catch (error) {
      toast.error("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={2} steps={MAKER_STEPS} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Complete your profile</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Tell us about your machine to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>What is your primary craft?</Label>
                <Select value={formData.serviceId} onValueChange={(v) => setFormData({ serviceId: v, brand: "", model: "" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your craft" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Machine Brand</Label>
                <Select value={formData.brand} disabled={!formData.serviceId} onValueChange={(v) => setFormData({ ...formData, brand: v, model: "" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Machine Model</Label>
                <Select value={formData.model} disabled={!formData.brand} onValueChange={(v) => setFormData({ ...formData, model: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Upload machine photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} required />
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading || !formData.model || !photo}>
                {loading ? "Saving..." : "Start my shop"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboarding;
