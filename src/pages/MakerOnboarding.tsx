import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICES } from "@/lib/services";
import { toast } from "sonner";

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
      // 1. Update user profile to 'maker'
      await supabase
        .from("profiles")
        .update({ role: "maker" })
        .eq("id", user.id);

      // 2. Register first machine
      await supabase
        .from("printers")
        .insert({
          owner_id: user.id,
          brand: formData.brand,
          model: formData.model,
          // Assuming basic mapping for simplicity, adjust as needed
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
    <div className="container py-24 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">Complete your maker profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select onValueChange={(v) => setFormData({ ...formData, serviceId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select your craft" />
          </SelectTrigger>
          <SelectContent>
            {SERVICES.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input 
          placeholder="Machine Brand (e.g. Bambu)" 
          value={formData.brand}
          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
          required
        />
        <Input 
          placeholder="Machine Model (e.g. X1C)" 
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Start my shop"}
        </Button>
      </form>
    </div>
  );
};

export default MakerOnboarding;
