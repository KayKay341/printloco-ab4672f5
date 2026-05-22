import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MotionWrapper } from "@/components/ui/MotionWrapper";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Wrench, ArrowRight } from "lucide-react";

const RoleSelection = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=signin", { replace: true });
    }
  }, [user, navigate]);


  const selectRole = async (role: "customer" | "maker") => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, role });
      if (error) throw error;
      await refreshProfile();
      toast.success("Welcome aboard!");
      if (role === "maker") {
        navigate("/onboarding/maker");
      } else {
        navigate("/services");
      }
    } catch (err) {
      toast.error("Failed to save role.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-24 flex justify-center items-center">
      <MotionWrapper className="w-full max-w-2xl px-4">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground">Welcome to PrintLoco</h1>
          <p className="text-xl text-muted-foreground mt-4">What brings you here?</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer group hover:border-primary transition-all duration-300 rounded-3xl border-2 shadow-lg hover:shadow-primary/20"
            onClick={() => !loading && selectRole("customer")}
          >
            <CardHeader className="text-center items-center pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4">
                <ShoppingBag size={32} />
              </div>
              <CardTitle className="font-display text-2xl">I want to order parts</CardTitle>
              <CardDescription className="text-base mt-2">Pick a service, upload your file, choose a local maker, check out.</CardDescription>
              <Button className="mt-6 gap-2 w-full" disabled={loading}>
                Start an order <ArrowRight size={16} />
              </Button>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer group hover:border-primary transition-all duration-300 rounded-3xl border-2 shadow-lg hover:shadow-primary/20"
            onClick={() => !loading && selectRole("maker")}
          >
            <CardHeader className="text-center items-center pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4">
                <Wrench size={32} />
              </div>
              <CardTitle className="font-display text-2xl">I want to be a maker</CardTitle>
              <CardDescription className="text-base mt-2">Register your machine, get verified, submit for review, then set up payouts.</CardDescription>
              <Button className="mt-6 gap-2 w-full" disabled={loading}>
                Become a maker <ArrowRight size={16} />
              </Button>
            </CardHeader>
          </Card>
        </div>
      </MotionWrapper>
    </div>
  );
};

export default RoleSelection;
