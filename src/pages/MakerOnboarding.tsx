import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SERVICES } from "@/lib/services";
import { toast } from "sonner";
import { motion } from "framer-motion";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      toast.success("Welcome, Maker!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
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
                <Select onValueChange={(v) => setFormData({ ...formData, serviceId: v })}>
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
                <Input 
                  placeholder="e.g. Bambu Lab" 
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Machine Model</Label>
                <Input 
                  placeholder="e.g. X1 Carbon" 
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading}>
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
