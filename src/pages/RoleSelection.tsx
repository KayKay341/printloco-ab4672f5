import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RoleSelection = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "customer" | "maker") => {
    if (!user) return;
    setLoading(true);
    try {
      // Upsert profile with selected role
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, role: role });
      
      if (error) throw error;
      
      await refreshProfile();
      toast.success("Role saved!");
      
      if (role === "maker") {
        navigate("/onboarding/maker");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to save role.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 max-w-lg text-center">
      <h1 className="text-3xl font-bold mb-6">Welcome! What are you here for?</h1>
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={() => selectRole("customer")} disabled={loading} variant="outline" className="h-32 text-lg">
          I want to order things
        </Button>
        <Button onClick={() => selectRole("maker")} disabled={loading} variant="outline" className="h-32 text-lg">
          I want to be a maker
        </Button>
      </div>
    </div>
  );
};

export default RoleSelection;
