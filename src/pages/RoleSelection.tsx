import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const RoleSelection = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "customer" | "maker") => {
    if (!user) return;
    setLoading(true);
    try {
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
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={1} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Welcome!</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">What are you here for?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button onClick={() => selectRole("customer")} disabled={loading} variant="outline" className="h-32 text-lg">
              I want to order things
            </Button>
            <Button onClick={() => selectRole("maker")} disabled={loading} variant="outline" className="h-32 text-lg">
              I want to be a maker
            </Button>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default RoleSelection;
