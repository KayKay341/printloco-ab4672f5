import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { OnboardingSteps } from "@/components/OnboardingSteps";
import { MotionWrapper } from "@/components/ui/MotionWrapper";

const MakerOnboardingImages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length < 3) {
      toast.error("Please upload at least 3 photos.");
      return;
    }
    setLoading(true);

    try {
      // 1. In a real app, upload files to storage here.
      // 2. Update printer status to 'pending_verification'
      await supabase
        .from("printers")
        .update({ verification_status: "pending" })
        .eq("owner_id", user?.id);

      toast.success("Photos uploaded! Awaiting admin verification.");
      navigate("/onboarding/complete");
    } catch (error) {
      toast.error("Failed to upload images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-24 flex justify-center items-center min-h-screen">
      <MotionWrapper className="w-full max-w-lg">
        <OnboardingSteps currentStep={3} />
        <Card className="rounded-3xl border border-border shadow-card p-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="font-display text-4xl font-semibold tracking-tight">Machine Verification</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Upload at least 3 photos of your machine, including one showing the serial number or a screenshot of your proof of purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Machine Photos (3+ required)</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  capture="environment" 
                  onChange={(e) => setFiles(e.target.files)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading || !files || files.length < 3}>
                {loading ? "Uploading..." : "Submit for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionWrapper>
    </div>
  );
};

export default MakerOnboardingImages;
